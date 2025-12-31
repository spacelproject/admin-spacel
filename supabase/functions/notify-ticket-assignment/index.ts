// Supabase Edge Function: notify-ticket-assignment
// Sends email notifications to support agents when a ticket is assigned to them
//
// Required secrets (Supabase Dashboard → Project Settings → Functions → Secrets):
// - RESEND_API_KEY
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
//
// This function is called from database webhooks when assigned_to is set/updated

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
  user_name,
  user_email,
  category,
  priority,
  created_at,
  description_preview,
  ticket_url,
  logo_url,
  assigned_by_name,
}: {
  ticket_subject: string;
  ticket_id: string;
  user_name: string;
  user_email: string;
  category: string;
  priority: string;
  created_at: string;
  description_preview?: string | null;
  ticket_url?: string | null;
  logo_url?: string | null;
  assigned_by_name?: string | null;
}) {
  const logoHtml = logo_url 
    ? `<img src="${logo_url}" alt="Spacel" style="max-width:120px;height:auto;display:block;margin:0 auto 20px;" />`
    : `<div style="width:120px;height:40px;background-color:#0D2B45;border-radius:4px;margin:0 auto 20px;display:block;color:#FFFFFF;font-weight:600;font-size:14px;line-height:40px;text-align:center;">SPACEL</div>`;
  
  const priorityBadge = getPriorityBadge(priority);
  const isUrgent = priority === "urgent" || priority === "high";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket Assigned: ${ticket_subject}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#F8FAFC;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);${isUrgent ? 'border-left:4px solid ' + priorityBadge.color + ';' : ''}">
          <tr>
            <td style="padding:40px;text-align:center;">
              ${logoHtml}
              
              <h1 style="color:#0F172A;font-size:24px;font-weight:600;margin:0 0 8px 0;">Ticket Assigned to You</h1>
              
              <div style="display:inline-block;background-color:${priorityBadge.bg};color:${priorityBadge.color};padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;margin:0 0 24px 0;">
                ${priorityBadge.text}
              </div>
              
              <p style="color:#475569;font-size:16px;line-height:24px;margin:0 0 24px 0;">
                A support ticket has been assigned to you and requires your attention.
              </p>
              
              <div style="background-color:#F1F5F9;border-radius:6px;padding:16px;margin:24px 0;text-align:left;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:8px 0;">
                      <strong style="color:#0F172A;">Subject:</strong>
                      <span style="color:#475569;margin-left:8px;">${ticket_subject}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;">
                      <strong style="color:#0F172A;">Ticket ID:</strong>
                      <span style="color:#475569;margin-left:8px;font-family:monospace;">${ticket_id}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;">
                      <strong style="color:#0F172A;">From:</strong>
                      <span style="color:#475569;margin-left:8px;">${user_name} (${user_email})</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;">
                      <strong style="color:#0F172A;">Category:</strong>
                      <span style="color:#475569;margin-left:8px;">${category || "General"}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;">
                      <strong style="color:#0F172A;">Created:</strong>
                      <span style="color:#475569;margin-left:8px;">${fmtDate(created_at)}</span>
                    </td>
                  </tr>
                  ${assigned_by_name ? `
                  <tr>
                    <td style="padding:8px 0;">
                      <strong style="color:#0F172A;">Assigned by:</strong>
                      <span style="color:#475569;margin-left:8px;">${assigned_by_name}</span>
                    </td>
                  </tr>
                  ` : ''}
                  ${description_preview ? `
                  <tr>
                    <td style="padding:8px 0;">
                      <strong style="color:#0F172A;">Preview:</strong>
                      <div style="color:#475569;margin-left:8px;margin-top:4px;padding:8px;background-color:#FFFFFF;border-radius:4px;font-size:14px;line-height:20px;">
                        ${description_preview.substring(0, 200)}${description_preview.length > 200 ? "..." : ""}
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
                  This ticket has been assigned to you. Please review and respond promptly.
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
    
    // Support webhook payload format
    // Webhook format: { type: 'UPDATE', table: 'support_tickets', record: { id: '...', assigned_to: '...', ... }, ... }
    let ticketId: string | undefined;
    let assignedTo: string | undefined;
    let oldAssignedTo: string | undefined;
    
    if (body.record && body.record.id) {
      ticketId = body.record.id as string;
      assignedTo = body.record.assigned_to as string;
      oldAssignedTo = body.old?.assigned_to as string | undefined;
    } else if (body.ticketId) {
      ticketId = body.ticketId as string;
      assignedTo = body.assignedTo as string;
      oldAssignedTo = body.oldAssignedTo as string | undefined;
    }

    if (!ticketId || !assignedTo) {
      return new Response(JSON.stringify({ error: "Missing ticketId or assignedTo" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Fetch ticket information first to check current state
    const { data: ticket, error: ticketErr } = await supabase
      .from("support_tickets")
      .select("id,ticket_id,subject,description,category,priority,status,user_id,created_at,assigned_to")
      .eq("id", ticketId)
      .maybeSingle();

    if (ticketErr) throw ticketErr;
    if (!ticket) {
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the ticket is assigned to the specified user
    if (ticket.assigned_to !== assignedTo) {
      return new Response(JSON.stringify({ message: "Ticket assignment mismatch, skipping notification" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplication: Check if assignment actually changed
    // Only send if: (NULL -> value) OR (value1 -> value2 where value1 != value2)
    // Skip if: (value -> same value) OR (NULL -> NULL)
    const assignmentChanged = 
      (oldAssignedTo === null || oldAssignedTo === undefined) && assignedTo !== null && assignedTo !== undefined
      || (oldAssignedTo !== null && oldAssignedTo !== undefined && assignedTo !== null && assignedTo !== undefined && oldAssignedTo !== assignedTo);

    if (!assignmentChanged && oldAssignedTo !== undefined && oldAssignedTo !== null) {
      // If we have old value and it's the same, skip
      return new Response(JSON.stringify({ message: "Assignment did not change, skipping notification" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enhanced deduplication: Check if we've already sent an assignment email for this ticket+agent combination
    // This prevents duplicates when webhook fires multiple times or old value is not provided
    // We check within the last 24 hours to catch duplicate assignments
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existingLogs, error: logCheckErr } = await supabase
      .from("system_logs")
      .select("id, created_at, details")
      .eq("source", "edge/notify-ticket-assignment")
      .eq("log_type", "info")
      .eq("details->>ticket_id", ticketId)
      .eq("details->>assigned_to", assignedTo)
      .gte("created_at", twentyFourHoursAgo)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!logCheckErr && existingLogs && existingLogs.length > 0) {
      // If we've already sent an email for this ticket+agent combination, skip unless:
      // 1. oldAssignedTo is provided AND different from assignedTo (reassignment case)
      // 2. If oldAssignedTo is not provided or is the same, we've already notified this agent about this ticket
      const isReassignment = oldAssignedTo !== undefined && oldAssignedTo !== null && oldAssignedTo !== assignedTo;
      
      if (!isReassignment) {
        // Not a reassignment, and we've already sent an email for this ticket+agent combo - skip duplicate
        return new Response(JSON.stringify({ message: "Assignment email already sent for this ticket+agent combination, skipping duplicate" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // If it's a reassignment (oldAssignedTo !== assignedTo), continue to send email to the new agent
    }

    // Fetch assigned support agent information
    const { data: assignedAgent, error: agentErr } = await supabase
      .from("admin_users")
      .select("role, profiles:user_id(email,first_name,last_name)")
      .eq("user_id", assignedTo)
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

    // Fetch customer information
    const { data: user, error: userErr } = await supabase
      .from("profiles")
      .select("id,email,first_name,last_name")
      .eq("id", ticket.user_id)
      .maybeSingle();

    if (userErr) throw userErr;

    const userName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "User";
    const userEmail = user?.email || "unknown@example.com";
    
    // Get admin panel URL
    const ADMIN_PANEL_URL = Deno.env.get("ADMIN_PANEL_URL") || "https://admin.spacel.app";
    const ticketUrl = `${ADMIN_PANEL_URL}/support-ticket-system?ticket=${ticketId}`;

    // Try to get who assigned the ticket (from old record if available)
    let assignedByName: string | null = null;
    if (body.old && body.old.assigned_to) {
      // Ticket was reassigned, try to get the assigner
      // This is a best-effort - we don't track who assigned it
      assignedByName = "Admin";
    }

    const APP_LOGO_URL = Deno.env.get("APP_LOGO_URL");
    
    const html = renderTemplate({
      ticket_subject: ticket.subject || "No Subject",
      ticket_id: ticket.ticket_id || ticket.id,
      user_name: userName,
      user_email: userEmail,
      category: ticket.category || "General",
      priority: ticket.priority || "medium",
      created_at: ticket.created_at || new Date().toISOString(),
      description_preview: ticket.description || null,
      ticket_url: ticketUrl,
      logo_url: APP_LOGO_URL || null,
      assigned_by_name: assignedByName,
    });

    const priorityPrefix = ticket.priority === "urgent" ? "🚨 URGENT: " : ticket.priority === "high" ? "⚠️ " : "";
    const subject = `${priorityPrefix}Ticket Assigned: ${ticket.subject || "No Subject"}`;

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
          source: "edge/notify-ticket-assignment",
          message: "Resend API error while sending ticket assignment notification",
          details: { 
            ticket_id: ticketId, 
            assigned_to: assignedTo,
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
        source: "edge/notify-ticket-assignment",
        message: "Ticket assignment notification email sent",
        details: {
          ticket_id: ticketId,
          ticket_subject: ticket.subject,
          assigned_to: assignedTo,
          recipient: agentEmail,
          priority: ticket.priority,
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

