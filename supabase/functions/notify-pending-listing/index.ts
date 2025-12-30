// Supabase Edge Function: notify-pending-listing
// Sends email notifications to admins and support agents when a listing becomes pending
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

function renderTemplate({
  listing_name,
  partner_name,
  is_resubmission,
  created_at,
  listing_url,
  logo_url,
}: {
  listing_name: string;
  partner_name: string;
  is_resubmission: boolean;
  created_at: string;
  listing_url?: string | null;
  logo_url?: string | null;
}) {
  const logoHtml = logo_url 
    ? `<img src="${logo_url}" alt="Spacel" style="max-width:120px;height:auto;display:block;margin:0 auto 20px;" />`
    : `<div style="width:120px;height:40px;background-color:#0D2B45;border-radius:4px;margin:0 auto 20px;display:block;color:#FFFFFF;font-weight:600;font-size:14px;line-height:40px;text-align:center;">SPACEL</div>`;
  
  const titleText = is_resubmission 
    ? "Listing Resubmitted for Review" 
    : "New Listing Pending Approval";
  const descriptionText = is_resubmission
    ? `"${listing_name}" by ${partner_name} has been resubmitted and is waiting for your review.`
    : `"${listing_name}" by ${partner_name} is waiting for approval.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titleText}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#F8FAFC;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding:40px;text-align:center;">
              ${logoHtml}
              
              <h1 style="color:#0F172A;font-size:24px;font-weight:600;margin:0 0 16px 0;">${titleText}</h1>
              
              <p style="color:#475569;font-size:16px;line-height:24px;margin:0 0 24px 0;">
                ${descriptionText}
              </p>
              
              <div style="background-color:#F1F5F9;border-radius:6px;padding:16px;margin:24px 0;text-align:left;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:8px 0;">
                      <strong style="color:#0F172A;">Listing:</strong>
                      <span style="color:#475569;margin-left:8px;">${listing_name}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;">
                      <strong style="color:#0F172A;">Partner:</strong>
                      <span style="color:#475569;margin-left:8px;">${partner_name}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;">
                      <strong style="color:#0F172A;">Submitted:</strong>
                      <span style="color:#475569;margin-left:8px;">${fmtDate(created_at)}</span>
                    </td>
                  </tr>
                </table>
              </div>
              
              ${listing_url ? `
              <div style="margin:32px 0;">
                <a href="${listing_url}" style="display:inline-block;background-color:#0D2B45;color:#FFFFFF;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:500;font-size:16px;">Review Listing</a>
              </div>
              ` : ''}
              
              <div style="margin:20px 0;padding-top:20px;border-top:1px solid #E2E8F0;">
                <p style="color:#64748B;font-size:14px;line-height:20px;margin:0;">
                  This is an automated notification. Please review the listing in the admin panel.
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
    const listingId = body.listingId as string | undefined;

    if (!listingId) {
      return new Response(JSON.stringify({ error: "Missing listingId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Fetch listing and partner information
    const { data: listing, error: listingErr } = await supabase
      .from("listings")
      .select("id,name,partner_id,status,rejected_at,created_at")
      .eq("id", listingId)
      .maybeSingle();

    if (listingErr) throw listingErr;
    if (!listing) {
      return new Response(JSON.stringify({ error: "Listing not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch partner information
    const { data: partner, error: partnerErr } = await supabase
      .from("profiles")
      .select("id,first_name,last_name")
      .eq("id", listing.partner_id)
      .maybeSingle();

    if (partnerErr) throw partnerErr;

    const partnerName = `${partner?.first_name || ""} ${partner?.last_name || ""}`.trim() || "Partner";
    const isResubmission = listing.rejected_at !== null;
    const listingUrl = `${SUPABASE_URL.replace('/rest/v1', '')}/admin/space-management?listing=${listingId}`;

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
      listing_name: listing.name || "Unnamed Listing",
      partner_name: partnerName,
      is_resubmission: isResubmission,
      created_at: listing.created_at || new Date().toISOString(),
      listing_url: listingUrl,
      logo_url: APP_LOGO_URL || null,
    });

    const subject = isResubmission
      ? `📋 Listing Resubmitted: "${listing.name || "Listing"}" needs review`
      : `📋 New Listing Pending: "${listing.name || "Listing"}" needs approval`;

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
          source: "edge/notify-pending-listing",
          message: "Resend API error while sending pending listing notification",
          details: { 
            listing_id: listingId, 
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
        source: "edge/notify-pending-listing",
        message: "Pending listing notification emails sent",
        details: {
          listing_id: listingId,
          listing_name: listing.name,
          recipient_count: recipientEmails.length,
          recipients: recipientEmails,
          is_resubmission: isResubmission,
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

