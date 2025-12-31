// Supabase Edge Function: notify-customer-reply
// Sends email notifications to customers when admins or support agents reply to their tickets
//
// Required secrets (Supabase Dashboard → Project Settings → Functions → Secrets):
// - RESEND_API_KEY
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
//
// Optional secrets:
// - APP_LOGO_URL
//
// This function is called from database webhooks when support_ticket_replies is inserted with admin_id
// Works for all admin roles: admin, super_admin, support

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

function renderTemplate({
  ticket_subject,
  ticket_id,
  agent_name,
  reply_message,
  logo_url,
}: {
  ticket_subject: string;
  ticket_id: string;
  agent_name: string;
  reply_message: string;
  logo_url?: string | null;
}) {
  const logoHtml = logo_url 
    ? `<img src="${logo_url}" alt="Spacel" style="max-width:120px;height:auto;display:block;margin:0 auto 20px;" />`
    : `<div style="width:120px;height:40px;background-color:#0D2B45;border-radius:4px;margin:0 auto 20px;display:block;color:#FFFFFF;font-weight:600;font-size:14px;line-height:40px;text-align:center;">SPACEL</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reply to Your Support Ticket: ${ticket_subject}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#F8FAFC;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding:40px;text-align:center;">
              ${logoHtml}
              
              <h1 style="color:#0F172A;font-size:24px;font-weight:600;margin:0 0 8px 0;">Response to Your Support Ticket</h1>
              
              <p style="color:#475569;font-size:16px;line-height:24px;margin:0 0 24px 0;">
                A member of our support team has responded to your ticket.
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
                      <strong style="color:#0F172A;">From:</strong>
                      <span style="color:#475569;margin-left:8px;">${agent_name}</span>
                    </td>
                  </tr>
                </table>
              </div>
              
              ${reply_message ? `
              <div style="background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:6px;padding:20px;margin:24px 0;text-align:left;">
                <p style="color:#475569;font-size:14px;line-height:20px;margin:0;white-space:pre-wrap;">${reply_message}</p>
              </div>
              ` : ''}
              
              <div style="margin:20px 0;padding-top:20px;border-top:1px solid #E2E8F0;">
                <p style="color:#64748B;font-size:14px;line-height:20px;margin:0;">
                  If you have any additional questions or concerns, please reply to this ticket. Our support team is here to help!
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
    // Webhook format: { type: 'INSERT', table: 'support_ticket_replies', record: { id: '...', ticket_id: '...', admin_id: '...', content: '...', ... }, ... }
    let ticketId: string | undefined;
    let replyId: string | undefined;
    let adminId: string | undefined;
    let replyContent: string | undefined;
    
    if (body.record) {
      replyId = body.record.id as string;
      ticketId = body.record.ticket_id as string;
      adminId = body.record.admin_id as string | null | undefined;
      replyContent = body.record.content || body.record.message || "";
    } else if (body.ticketId && body.adminId) {
      ticketId = body.ticketId as string;
      adminId = body.adminId as string;
      replyContent = body.replyContent || "";
    }

    if (!ticketId) {
      return new Response(JSON.stringify({ error: "Missing ticketId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only send email if this is an admin/support agent reply (admin_id is set)
    // This works for all admin roles: admin, super_admin, support
    if (!adminId) {
      return new Response(JSON.stringify({ message: "Not an admin reply (no admin_id), skipping notification" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Fetch ticket information
    const { data: ticket, error: ticketErr } = await supabase
      .from("support_tickets")
      .select("id,ticket_id,subject,user_id")
      .eq("id", ticketId)
      .maybeSingle();

    if (ticketErr) throw ticketErr;
    if (!ticket) {
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404,
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

    // Fetch admin/support agent information (works for all admin roles: admin, super_admin, support)
    const { data: adminUser, error: adminErr } = await supabase
      .from("admin_users")
      .select("user_id, profiles:user_id(first_name,last_name,email)")
      .eq("user_id", adminId)
      .eq("is_active", true)
      .maybeSingle();

    if (adminErr) throw adminErr;
    
    // If admin user not found or not active, still send email but use generic name
    const adminName = adminUser?.profiles 
      ? `${(adminUser.profiles as any).first_name || ""} ${(adminUser.profiles as any).last_name || ""}`.trim() || (adminUser.profiles as any).email || "Support Team"
      : "Support Team";

    const APP_LOGO_URL = Deno.env.get("APP_LOGO_URL");
    
    const html = renderTemplate({
      ticket_subject: ticket.subject || "No Subject",
      ticket_id: ticket.ticket_id || ticket.id,
      agent_name: adminName,
      reply_message: replyContent || "",
      logo_url: APP_LOGO_URL || null,
    });

    const subject = `Re: ${ticket.subject || "Your Support Ticket"}`;

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
          source: "edge/notify-customer-reply",
          message: "Resend API error while sending customer reply notification",
          details: { 
            ticket_id: ticketId,
            reply_id: replyId,
            customer_email: customer.email,
            admin_id: adminId,
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
        source: "edge/notify-customer-reply",
        message: "Customer reply notification email sent",
        details: {
          ticket_id: ticketId,
          ticket_subject: ticket.subject,
          reply_id: replyId,
          customer_email: customer.email,
          admin_id: adminId,
          admin_name: adminName,
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

