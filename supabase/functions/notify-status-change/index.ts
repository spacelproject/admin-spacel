// Supabase Edge Function: notify-status-change
// Sends email notifications to customers when support ticket status changes
//
// Required secrets (Supabase Dashboard → Project Settings → Functions → Secrets):
// - RESEND_API_KEY
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
//
// Optional secrets:
// - APP_LOGO_URL
//
// This function is called from database webhooks when support_tickets status is updated
// Status values: open, pending, in-progress, resolved, closed

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

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    open: "Open",
    pending: "Pending",
    "in-progress": "In Progress",
    resolved: "Resolved",
    closed: "Closed",
  };
  return statusMap[status] || status;
}

function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    open: "#2563EB",
    pending: "#CA8A04",
    "in-progress": "#9333EA",
    resolved: "#16A34A",
    closed: "#6B7280",
  };
  return colorMap[status] || "#6B7280";
}

function getStatusMessage(newStatus: string, oldStatus: string): string {
  const messages: Record<string, string> = {
    open: "Your ticket has been reopened and is now being reviewed.",
    pending: "Your ticket is now pending review by our support team.",
    "in-progress": "Our support team is now actively working on your ticket.",
    resolved: "Your ticket has been resolved. If you have any further questions, please reply to this ticket.",
    closed: "Your ticket has been closed. If you need additional assistance, please create a new ticket.",
  };
  return messages[newStatus] || `Your ticket status has been updated to ${formatStatus(newStatus)}.`;
}

function renderTemplate({
  ticket_subject,
  ticket_id,
  old_status,
  new_status,
  status_message,
  logo_url,
}: {
  ticket_subject: string;
  ticket_id: string;
  old_status: string;
  new_status: string;
  status_message: string;
  logo_url?: string | null;
}) {
  const logoHtml = logo_url 
    ? `<img src="${logo_url}" alt="Spacel" style="max-width:120px;height:auto;display:block;margin:0 auto 20px;" />`
    : `<div style="width:120px;height:40px;background-color:#0D2B45;border-radius:4px;margin:0 auto 20px;display:block;color:#FFFFFF;font-weight:600;font-size:14px;line-height:40px;text-align:center;">SPACEL</div>`;

  const statusColor = getStatusColor(new_status);
  const isResolvedOrClosed = new_status === "resolved" || new_status === "closed";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket Status Update: ${ticket_subject}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#F8FAFC;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);${isResolvedOrClosed ? 'border-left:4px solid ' + statusColor + ';' : ''}">
          <tr>
            <td style="padding:40px;text-align:center;">
              ${logoHtml}
              
              <h1 style="color:#0F172A;font-size:24px;font-weight:600;margin:0 0 8px 0;">Ticket Status Updated</h1>
              
              <div style="display:inline-block;background-color:${statusColor}15;color:${statusColor};padding:8px 16px;border-radius:12px;font-size:14px;font-weight:600;margin:0 0 24px 0;border:1px solid ${statusColor}40;">
                ${formatStatus(new_status)}
              </div>
              
              <p style="color:#475569;font-size:16px;line-height:24px;margin:0 0 24px 0;">
                ${status_message}
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
                  <tr>
                    <td style="padding:8px 0;">
                      <strong style="color:#0F172A;">Previous Status:</strong>
                      <span style="color:#475569;margin-left:8px;">${formatStatus(old_status)}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;">
                      <strong style="color:#0F172A;">New Status:</strong>
                      <span style="color:${statusColor};margin-left:8px;font-weight:600;">${formatStatus(new_status)}</span>
                    </td>
                  </tr>
                </table>
              </div>
              
              <div style="margin:20px 0;padding-top:20px;border-top:1px solid #E2E8F0;">
                <p style="color:#64748B;font-size:14px;line-height:20px;margin:0;">
                  ${isResolvedOrClosed ? 'If you need additional assistance, please create a new support ticket.' : 'Our support team will continue to work on your ticket and keep you updated.'}
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
    // Webhook format: { type: 'UPDATE', table: 'support_tickets', record: { id: '...', status: '...', ... }, old: { status: '...', ... }, ... }
    let ticketId: string | undefined;
    let oldStatus: string | undefined;
    let newStatus: string | undefined;
    
    if (body.record && body.record.id) {
      ticketId = body.record.id as string;
      // Check if old record exists (for UPDATE events)
      if (body.old) {
        oldStatus = body.old.status as string | undefined;
      }
      newStatus = body.record.status as string | undefined;
    } else if (body.ticketId) {
      ticketId = body.ticketId as string;
      oldStatus = body.oldStatus as string | undefined;
      newStatus = body.newStatus as string | undefined;
    }

    if (!ticketId) {
      return new Response(JSON.stringify({ error: "Missing ticketId", received: Object.keys(body) }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Fetch ticket information to get current status
    const { data: ticket, error: ticketErr } = await supabase
      .from("support_tickets")
      .select("id,ticket_id,subject,user_id,status")
      .eq("id", ticketId)
      .maybeSingle();

    if (ticketErr) throw ticketErr;
    if (!ticket) {
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use the fetched ticket status as newStatus if not provided
    if (!newStatus) {
      newStatus = ticket.status;
    }

    // If oldStatus is not provided in the webhook payload, we can't determine if status changed
    // This happens when webhook fires but status field wasn't part of the update
    // Skip notification if we don't have old status from the webhook payload
    if (!oldStatus) {
      return new Response(JSON.stringify({ message: "Old status not provided in webhook payload, skipping notification (status may not have changed)" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the status actually changed
    if (oldStatus === newStatus) {
      return new Response(JSON.stringify({ message: "Status did not change, skipping notification" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch customer information
    const { data: customer, error: customerErr } = await supabase
      .from("profiles")
      .select("id,email,first_name,last_name")
      .eq("id", ticket.user_id)
      .maybeSingle();

    if (customerErr) throw customerErr;
    if (!customer || !customer.email) {
      return new Response(JSON.stringify({ error: "Customer not found or email missing" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const APP_LOGO_URL = Deno.env.get("APP_LOGO_URL");
    const statusMessage = getStatusMessage(newStatus, oldStatus);
    
    const html = renderTemplate({
      ticket_subject: ticket.subject || "No Subject",
      ticket_id: ticket.ticket_id || ticket.id,
      old_status: oldStatus,
      new_status: newStatus,
      status_message: statusMessage,
      logo_url: APP_LOGO_URL || null,
    });

    const subject = `Ticket Status Updated: ${ticket.subject || "Your Support Ticket"}`;

    // Send email to the customer
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Spacel Support <support@spacel.app>",
        to: customer.email,
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
          source: "edge/notify-status-change",
          message: "Resend API error while sending status change notification",
          details: { 
            ticket_id: ticketId,
            old_status: oldStatus,
            new_status: newStatus,
            customer_email: customer.email,
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
        source: "edge/notify-status-change",
        message: "Status change notification email sent",
        details: {
          ticket_id: ticketId,
          ticket_subject: ticket.subject,
          old_status: oldStatus,
          new_status: newStatus,
          customer_email: customer.email,
          resend: resendData,
        },
        created_at: new Date().toISOString(),
      });
    } catch {
      // ignore logging failures
    }

    return new Response(JSON.stringify({ ok: true, recipient: customer.email, resend: resendData }), {
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

