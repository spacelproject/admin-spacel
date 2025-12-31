// Supabase Edge Function: notify-ticket-activity
// Sends email notifications to assigned support agents when there's activity on their tickets
// Activity includes: customer messages, priority changes, internal notes
//
// Required secrets (Supabase Dashboard → Project Settings → Functions → Secrets):
// - RESEND_API_KEY
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
//
// This function is called from database webhooks on ticket activity

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-US", { timeZone: "UTC" }) + " UTC";
  } catch {
    return String(iso);
  }
}

function getPriorityBadge(priority: string) {
  const badges: Record<string, { color: string; bg: string; text: string }> = {
    urgent: { color: "#DC2626", bg: "#FEE2E2", text: "Urgent" },
    high: { color: "#EA580C", bg: "#FFEDD5", text: "High Priority" },
    medium: { color: "#CA8A04", bg: "#FEF9C3", text: "Medium Priority" },
    low: { color: "#16A34A", bg: "#DCFCE7", text: "Low Priority" },
  };
  return badges[priority] || badges.medium;
}

function renderTemplate({
  ticket_subject,
  ticket_id,
  activity_type,
  activity_message,
  priority,
  ticket_url,
  logo_url,
  is_internal,
}: {
  ticket_subject: string;
  ticket_id: string;
  activity_type: "message" | "priority_change" | "internal_note";
  activity_message: string;
  priority: string;
  ticket_url?: string | null;
  logo_url?: string | null;
  is_internal?: boolean;
}) {
  const logoHtml = logo_url 
    ? `<img src="${logo_url}" alt="Spacel" style="max-width:120px;height:auto;display:block;margin:0 auto 20px;" />`
    : `<div style="width:120px;height:40px;background-color:#0D2B45;border-radius:4px;margin:0 auto 20px;display:block;color:#FFFFFF;font-weight:600;font-size:14px;line-height:40px;text-align:center;">SPACEL</div>`;
  
  const priorityBadge = getPriorityBadge(priority);
  const isUrgent = priority === "urgent" || priority === "high";

  let titleText = "";
  let descriptionText = "";
  
  if (activity_type === "message") {
    titleText = is_internal ? "New Internal Note" : "New Customer Message";
    descriptionText = is_internal 
      ? "A new internal note has been added to your assigned ticket."
      : "The customer has sent a new message on your assigned ticket.";
  } else if (activity_type === "priority_change") {
    titleText = "Ticket Priority Changed";
    descriptionText = "The priority of your assigned ticket has been updated.";
  } else if (activity_type === "internal_note") {
    titleText = "New Internal Note";
    descriptionText = "A new internal note has been added to your assigned ticket.";
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titleText}: ${ticket_subject}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#F8FAFC;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);${isUrgent ? 'border-left:4px solid ' + priorityBadge.color + ';' : ''}">
          <tr>
            <td style="padding:40px;text-align:center;">
              ${logoHtml}
              
              <h1 style="color:#0F172A;font-size:24px;font-weight:600;margin:0 0 8px 0;">${titleText}</h1>
              
              <div style="display:inline-block;background-color:${priorityBadge.bg};color:${priorityBadge.color};padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;margin:0 0 24px 0;">
                ${priorityBadge.text}
              </div>
              
              <p style="color:#475569;font-size:16px;line-height:24px;margin:0 0 24px 0;">
                ${descriptionText}
              </p>
              
              <div style="background-color:#F1F5F9;border-radius:6px;padding:16px;margin:24px 0;text-align:left;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:8px 0;">
                      <strong style="color:#0F172A;">Ticket:</strong>
                      <span style="color:#475569;margin-left:8px;">${ticket_subject}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;">
                      <strong style="color:#0F172A;">Ticket ID:</strong>
                      <span style="color:#475569;margin-left:8px;font-family:monospace;">${ticket_id}</span>
                    </td>
                  </tr>
                  ${activity_message ? `
                  <tr>
                    <td style="padding:8px 0;">
                      <strong style="color:#0F172A;">${activity_type === "priority_change" ? "New Priority:" : activity_type === "internal_note" ? "Internal Note:" : "Message:"}</strong>
                      <div style="color:#475569;margin-left:8px;margin-top:4px;padding:8px;background-color:#FFFFFF;border-radius:4px;font-size:14px;line-height:20px;">
                        ${activity_message}
                      </div>
                    </td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              
              ${ticket_url ? `
              <div style="margin:32px 0;">
                <a href="${ticket_url}" style="display:inline-block;background-color:#0D2B45;color:#FFFFFF;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:500;font-size:16px;">View Ticket</a>
              </div>
              ` : ''}
              
              <div style="margin:20px 0;padding-top:20px;border-top:1px solid #E2E8F0;">
                <p style="color:#64748B;font-size:14px;line-height:20px;margin:0;">
                  This is an automated notification for activity on your assigned ticket. Please review and respond as needed.
                </p>
              </div>
              
              <div style="margin-top:20px;font-size:12px;color:#94A3B8;">
                © 2025 Spacel. All rights reserved.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing RESEND_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    
    // Support multiple webhook payload formats
    // Format 1: Ticket message/reply (ticket_messages or support_ticket_replies)
    // Format 2: Ticket priority change (support_tickets UPDATE)
    let ticketId: string | undefined;
    let activityType: "message" | "priority_change" | "internal_note" = "message";
    let activityMessage: string | undefined;
    let isInternal: boolean = false;
    let newPriority: string | undefined;
    
    // Check if this is a message/reply
    if (body.record && (body.table === "ticket_messages" || body.table === "support_ticket_replies")) {
      ticketId = body.record.ticket_id as string;
      activityMessage = body.record.message || body.record.content || "";
      isInternal = body.record.is_internal === true || body.record.is_internal === "true";
      activityType = isInternal ? "internal_note" : "message";
    }
    // Check if this is a priority change
    else if (body.record && body.table === "support_tickets" && body.old) {
      ticketId = body.record.id as string;
      const oldPriority = body.old.priority as string;
      newPriority = body.record.priority as string;
      if (oldPriority !== newPriority) {
        activityType = "priority_change";
        activityMessage = `Priority changed from ${oldPriority} to ${newPriority}`;
      } else {
        // Not a priority change, skip
        return new Response(JSON.stringify({ message: "No priority change detected" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    // Direct call format
    else if (body.ticketId) {
      ticketId = body.ticketId as string;
      activityType = body.activityType || "message";
      activityMessage = body.activityMessage || "";
      isInternal = body.isInternal === true;
    }

    if (!ticketId) {
      return new Response(JSON.stringify({ error: "Missing ticketId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Fetch ticket information
    const { data: ticket, error: ticketErr } = await supabase
      .from("support_tickets")
      .select("id,ticket_id,subject,priority,status,assigned_to")
      .eq("id", ticketId)
      .maybeSingle();

    if (ticketErr) throw ticketErr;
    if (!ticket) {
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only notify if ticket is assigned
    if (!ticket.assigned_to) {
      return new Response(JSON.stringify({ message: "Ticket is not assigned, skipping notification" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch assigned support agent information
    const { data: assignedAgent, error: agentErr } = await supabase
      .from("admin_users")
      .select("role, profiles:user_id(email,first_name,last_name)")
      .eq("user_id", ticket.assigned_to)
      .eq("role", "support")
      .eq("is_active", true)
      .maybeSingle();

    if (agentErr) throw agentErr;
    if (!assignedAgent) {
      return new Response(JSON.stringify({ message: "Assigned user is not an active support agent, skipping notification" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const agentEmail = (assignedAgent.profiles as any)?.email;
    if (!agentEmail) {
      return new Response(JSON.stringify({ error: "Assigned agent email not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get admin panel URL
    const ADMIN_PANEL_URL = Deno.env.get("ADMIN_PANEL_URL") || "https://admin.spacel.app";
    const ticketUrl = `${ADMIN_PANEL_URL}/support-ticket-system?ticket=${ticketId}`;

    // Use new priority if it's a priority change
    const priority = newPriority || ticket.priority || "medium";

    const APP_LOGO_URL = Deno.env.get("APP_LOGO_URL");
    
    const html = renderTemplate({
      ticket_subject: ticket.subject || "No Subject",
      ticket_id: ticket.ticket_id || ticket.id,
      activity_type: activityType,
      activity_message: activityMessage || "",
      priority: priority,
      ticket_url: ticketUrl,
      logo_url: APP_LOGO_URL || null,
      is_internal: isInternal,
    });

    let subject = "";
    const priorityPrefix = priority === "urgent" ? "🚨 URGENT: " : priority === "high" ? "⚠️ " : "";
    
    if (activityType === "message") {
      subject = `${priorityPrefix}New Message: ${ticket.subject || "No Subject"}`;
    } else if (activityType === "priority_change") {
      subject = `${priorityPrefix}Priority Changed: ${ticket.subject || "No Subject"}`;
    } else if (activityType === "internal_note") {
      subject = `📝 Internal Note: ${ticket.subject || "No Subject"}`;
    }

    // Send email to the assigned support agent
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Spacel <hello@spacel.app>",
        to: agentEmail,
        subject,
        html,
      }),
    });

    const resendData = await resendRes.json().catch(() => ({}));
    if (!resendRes.ok) {
      try {
        await supabase.from("system_logs").insert({
          log_type: "error",
          severity: "high",
          source: "edge/notify-ticket-activity",
          message: "Resend API error while sending ticket activity notification",
          details: { 
            ticket_id: ticketId, 
            activity_type: activityType,
            assigned_to: ticket.assigned_to,
            recipient: agentEmail,
            resend: resendData 
          },
          created_at: new Date().toISOString(),
        });
      } catch {
        // ignore logging failures
      }

      return new Response(
        JSON.stringify({ error: "Resend API error", resend: resendData }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log successful email send
    try {
      await supabase.from("system_logs").insert({
        log_type: "info",
        severity: "info",
        source: "edge/notify-ticket-activity",
        message: "Ticket activity notification email sent",
        details: {
          ticket_id: ticketId,
          ticket_subject: ticket.subject,
          activity_type: activityType,
          assigned_to: ticket.assigned_to,
          recipient: agentEmail,
          priority: priority,
          is_internal: isInternal,
          resend: resendData,
        },
        created_at: new Date().toISOString(),
      });
    } catch {
      // ignore logging failures
    }

    return new Response(JSON.stringify({ ok: true, recipient: agentEmail, resend: resendData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

