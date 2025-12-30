// Supabase Edge Function: notify-new-ticket
// Sends email notifications to admins and support agents when a new support ticket is created
//
// Required secrets (Supabase Dashboard → Project Settings → Functions → Secrets):
// - RESEND_API_KEY
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
//
// This function can be called from database triggers using pg_net or from the frontend

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
  <title>New Support Ticket: ${ticket_subject}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#F8FAFC;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);${isUrgent ? 'border-left:4px solid ' + priorityBadge.color + ';' : ''}">
          <tr>
            <td style="padding:40px;text-align:center;">
              ${logoHtml}
              
              <h1 style="color:#0F172A;font-size:24px;font-weight:600;margin:0 0 8px 0;">New Support Ticket</h1>
              
              <div style="display:inline-block;background-color:${priorityBadge.bg};color:${priorityBadge.color};padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;margin:0 0 24px 0;">
                ${priorityBadge.text}
              </div>
              
              <p style="color:#475569;font-size:16px;line-height:24px;margin:0 0 24px 0;">
                A new support ticket has been created and requires your attention.
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
                  This is an automated notification. Please review and respond to the ticket in the support panel.
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
    const ticketId = body.ticketId as string | undefined;

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
      .select("id,ticket_id,subject,description,category,priority,status,user_id,created_at")
      .eq("id", ticketId)
      .maybeSingle();

    if (ticketErr) throw ticketErr;
    if (!ticket) {
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only send for open tickets
    if (ticket.status !== "open") {
      return new Response(JSON.stringify({ message: "Ticket is not open, skipping notification" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user information
    const { data: user, error: userErr } = await supabase
      .from("profiles")
      .select("id,email,first_name,last_name")
      .eq("id", ticket.user_id)
      .maybeSingle();

    if (userErr) throw userErr;

    const userName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "User";
    const userEmail = user?.email || "unknown@example.com";
    const ticketUrl = `${SUPABASE_URL.replace('/rest/v1', '')}/admin/support-ticket-system?ticket=${ticketId}`;

    // Fetch all admin and support agent emails
    const { data: adminUsers, error: adminErr } = await supabase
      .from("admin_users")
      .select("email,role")
      .in("role", ["admin", "super_admin", "support"])
      .eq("is_active", true);

    if (adminErr) throw adminErr;

    if (!adminUsers || adminUsers.length === 0) {
      return new Response(JSON.stringify({ error: "No admin or support users found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipientEmails = adminUsers.map((u) => u.email).filter(Boolean);

    if (recipientEmails.length === 0) {
      return new Response(JSON.stringify({ error: "No valid email addresses found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
    });

    const priorityPrefix = ticket.priority === "urgent" ? "🚨 URGENT: " : ticket.priority === "high" ? "⚠️ " : "";
    const subject = `${priorityPrefix}New Support Ticket: ${ticket.subject || "No Subject"}`;

    // Send email via Resend to all recipients
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Spacel <hello@spacel.app>",
        to: recipientEmails,
        subject,
        html,
      }),
    });

    const resendData = await resendRes.json().catch(() => ({}));
    if (!resendRes.ok) {
      // Log failure
      try {
        await supabase.from("system_logs").insert({
          log_type: "error",
          severity: "high",
          source: "edge/notify-new-ticket",
          message: "Resend API error while sending new ticket notification",
          details: { 
            ticket_id: ticketId, 
            recipient_count: recipientEmails.length,
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
        source: "edge/notify-new-ticket",
        message: "New ticket notification emails sent",
        details: {
          ticket_id: ticketId,
          ticket_subject: ticket.subject,
          recipient_count: recipientEmails.length,
          recipients: recipientEmails,
          priority: ticket.priority,
          resend: resendData,
        },
        created_at: new Date().toISOString(),
      });
    } catch {
      // ignore logging failures
    }

    return new Response(JSON.stringify({ ok: true, recipients: recipientEmails.length, resend: resendData }), {
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

