// Supabase Edge Function: send-suspension-email
// Sends suspension emails via Resend and logs to system_logs.
//
// Required secrets (Supabase Dashboard → Project Settings → Functions → Secrets):
// - RESEND_API_KEY
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
//
// This function is invoked from the admin panel (browser) using supabase.functions.invoke.

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
  full_name,
  suspended_at,
  suspension_reason,
  logo_url,
}: {
  full_name: string;
  suspended_at: string;
  suspension_reason?: string | null;
  logo_url?: string | null;
}) {
  const hasReason = Boolean(suspension_reason && suspension_reason.trim());
  const logoHtml = logo_url 
    ? `<img src="${logo_url}" alt="Spacel" style="max-width:120px;height:auto;display:block;margin:0 auto 20px;" />`
    : `<div style="width:120px;height:40px;background-color:#0D2B45;border-radius:4px;margin:0 auto 20px;display:block;color:#FFFFFF;font-weight:600;font-size:14px;line-height:40px;text-align:center;">SPACEL</div>`;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Suspended</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',Roboto,sans-serif;background-color:#f5f7fb;line-height:1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f5f7fb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:8px;">
          <!-- Header -->
          <tr>
            <td style="padding:40px 40px 30px;text-align:center;background-color:#FFFFFF;">
              ${logoHtml}
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding:0 40px 40px;background-color:#FFFFFF;">
              <h2 style="font-size:24px;font-weight:600;color:#DC2626;margin:0 0 16px;line-height:1.3;">Account Suspended</h2>
              
              <p style="font-size:16px;color:#64748B;margin:0 0 20px;line-height:1.6;">
                Hi ${full_name || "there"},
              </p>
              
              <p style="font-size:16px;color:#0D2B45;margin:0 0 32px;line-height:1.7;">
                Your Spacel account has been suspended as of <strong>${suspended_at || ""}</strong>. You may be logged out and actions will be restricted.
              </p>
              
              ${hasReason ? `
              <div style="background-color:#F8FAFC;padding:20px;border-radius:8px;border-left:3px solid #DC2626;margin:24px 0;">
                <div style="font-size:12px;font-weight:600;color:#DC2626;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Reason</div>
                <div style="font-size:18px;font-weight:600;color:#0D2B45;line-height:1.6;">${suspension_reason || ""}</div>
              </div>
              ` : ""}
              
              <p style="font-size:14px;color:#64748B;margin:32px 0 0;line-height:1.6;">
                If you believe this is a mistake, please contact our support team.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding:32px 40px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
              <div style="margin-bottom:20px;">
                <div style="font-size:14px;font-weight:600;color:#0D2B45;margin-bottom:8px;">Need help?</div>
                <a href="mailto:hello@spacel.app" style="color:#F27C2A;text-decoration:none;font-size:14px;">Contact Support</a>
              </div>
              
              <div style="margin:20px 0;padding-top:20px;border-top:1px solid #E2E8F0;">
                <a href="https://www.spacel.app/privacy-policy" style="color:#64748B;text-decoration:none;font-size:12px;margin:0 8px;">Privacy Policy</a>
                <span style="margin:0 4px;color:#E2E8F0;">|</span>
                <a href="https://www.spacel.app/terms-of-service" style="color:#64748B;text-decoration:none;font-size:12px;margin:0 8px;">Terms of Service</a>
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

function renderListingTemplate({
  full_name,
  listing_name,
  suspended_at,
  suspension_reason,
  logo_url,
}: {
  full_name: string;
  listing_name: string;
  suspended_at: string;
  suspension_reason?: string | null;
  logo_url?: string | null;
}) {
  const hasReason = Boolean(suspension_reason && suspension_reason.trim());
  const logoHtml = logo_url 
    ? `<img src="${logo_url}" alt="Spacel" style="max-width:120px;height:auto;display:block;margin:0 auto 20px;" />`
    : `<div style="width:120px;height:40px;background-color:#0D2B45;border-radius:4px;margin:0 auto 20px;display:block;color:#FFFFFF;font-weight:600;font-size:14px;line-height:40px;text-align:center;">SPACEL</div>`;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Listing Suspended</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',Roboto,sans-serif;background-color:#f5f7fb;line-height:1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f5f7fb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:8px;">
          <!-- Header -->
          <tr>
            <td style="padding:40px 40px 30px;text-align:center;background-color:#FFFFFF;">
              ${logoHtml}
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding:0 40px 40px;background-color:#FFFFFF;">
              <h2 style="font-size:24px;font-weight:600;color:#DC2626;margin:0 0 16px;line-height:1.3;">Listing Suspended</h2>
              
              <p style="font-size:16px;color:#64748B;margin:0 0 20px;line-height:1.6;">
                Hi ${full_name || "there"},
              </p>
              
              <p style="font-size:16px;color:#0D2B45;margin:0 0 32px;line-height:1.7;">
                Your listing <strong>${listing_name || "your listing"}</strong> has been suspended as of <strong>${suspended_at || ""}</strong>. The listing is now hidden from public view, but you can still manage it and view existing bookings.
              </p>
              
              ${hasReason ? `
              <div style="background-color:#F8FAFC;padding:20px;border-radius:8px;border-left:3px solid #DC2626;margin:24px 0;">
                <div style="font-size:12px;font-weight:600;color:#DC2626;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Reason</div>
                <div style="font-size:18px;font-weight:600;color:#0D2B45;line-height:1.6;">${suspension_reason || ""}</div>
              </div>
              ` : ""}
              
              <p style="font-size:14px;color:#64748B;margin:32px 0 0;line-height:1.6;">
                If you have any questions or need assistance, please contact our support team.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding:32px 40px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
              <div style="margin-bottom:20px;">
                <div style="font-size:14px;font-weight:600;color:#0D2B45;margin-bottom:8px;">Need help?</div>
                <a href="mailto:hello@spacel.app" style="color:#F27C2A;text-decoration:none;font-size:14px;">Contact Support</a>
              </div>
              
              <div style="margin:20px 0;padding-top:20px;border-top:1px solid #E2E8F0;">
                <a href="https://www.spacel.app/privacy-policy" style="color:#64748B;text-decoration:none;font-size:12px;margin:0 8px;">Privacy Policy</a>
                <span style="margin:0 4px;color:#E2E8F0;">|</span>
                <a href="https://www.spacel.app/terms-of-service" style="color:#64748B;text-decoration:none;font-size:12px;margin:0 8px;">Terms of Service</a>
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
    const userId = body.userId as string | undefined;
    const listingId = body.listingId as string | undefined;
    const suspensionReason =
      (body.suspensionReason as string | undefined) ??
      (body.suspension_reason as string | undefined) ??
      null;
    const suspendedAt =
      (body.suspendedAt as string | undefined) ??
      (body.suspended_at as string | undefined) ??
      new Date().toISOString();

    if (!userId && !listingId) {
      return new Response(JSON.stringify({ error: "Missing userId or listingId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    let toEmail: string | null = null;
    let html = "";
    let logUserId: string | null = null;

    if (listingId) {
      const { data: listing, error: listingErr } = await supabase
        .from("listings")
        .select("id,name,partner_id")
        .eq("id", listingId)
        .maybeSingle();

      if (listingErr) throw listingErr;
      if (!listing?.partner_id) {
        return new Response(JSON.stringify({ error: "Listing has no partner_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: owner, error: ownerErr } = await supabase
        .from("profiles")
        .select("id,email,first_name,last_name")
        .eq("id", listing.partner_id)
        .maybeSingle();

      if (ownerErr) throw ownerErr;
      toEmail = owner?.email ?? null;
      if (!toEmail) {
        return new Response(JSON.stringify({ error: "No email for listing owner" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const fullName =
        `${owner?.first_name || ""} ${owner?.last_name || ""}`.trim() || "there";

      const APP_LOGO_URL = Deno.env.get("APP_LOGO_URL");
      
      html = renderListingTemplate({
        full_name: fullName,
        listing_name: listing?.name || "your listing",
        suspended_at: fmtDate(suspendedAt),
        suspension_reason: suspensionReason,
        logo_url: APP_LOGO_URL || null,
      });
      logUserId = owner?.id ?? null;
    } else {
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        // NOTE: profiles table does NOT have full_name in this project
        .select("id,email,first_name,last_name")
        .eq("id", userId)
        .maybeSingle();

      if (profileErr) throw profileErr;
      toEmail = profile?.email ?? null;
      if (!toEmail) {
        return new Response(JSON.stringify({ error: "No email for user" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const fullName =
        `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "there";

      const APP_LOGO_URL = Deno.env.get("APP_LOGO_URL");
      
      html = renderTemplate({
        full_name: fullName,
        suspended_at: fmtDate(suspendedAt),
        suspension_reason: suspensionReason,
        logo_url: APP_LOGO_URL || null,
      });
      logUserId = profile?.id ?? null;
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Spacel <hello@spacel.app>",
        to: [toEmail],
        subject: listingId ? "Listing Suspended" : "Account Suspended",
        html,
      }),
    });

    const resendData = await resendRes.json().catch(() => ({}));
    if (!resendRes.ok) {
      // Try to log failure but don't throw away response context
      try {
        await supabase.from("system_logs").insert({
          log_type: "error",
          severity: "high",
          source: "edge/send-suspension-email",
          message: listingId
            ? "Resend API error while sending listing suspension email"
            : "Resend API error while sending suspension email",
          user_id: logUserId,
          details: { to: toEmail, listing_id: listingId || null, resend: resendData },
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

    try {
      await supabase.from("system_logs").insert({
        log_type: "info",
        severity: "info",
        source: "edge/send-suspension-email",
        message: listingId ? "Listing suspension email sent" : "Suspension email sent",
        user_id: logUserId,
        details: {
          to: toEmail,
          listing_id: listingId || null,
          suspended_at: suspendedAt,
          has_reason: Boolean(suspensionReason && suspensionReason.trim()),
          resend: resendData,
        },
        created_at: new Date().toISOString(),
      });
    } catch {
      // ignore logging failures
    }

    return new Response(JSON.stringify({ ok: true, resend: resendData }), {
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


