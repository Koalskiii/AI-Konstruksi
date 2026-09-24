import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SECRET_KEYS_RAW = Deno.env.get("SUPABASE_SECRET_KEYS");
const PUBLISHABLE_KEYS_RAW = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getDefaultKey(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.default ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });

  if (!RESEND_API_KEY || !SUPABASE_URL || !SECRET_KEYS_RAW) {
    return Response.json({ error: "Server email configuration is incomplete" }, { status: 500, headers: corsHeaders });
  }

  const expectedPublishableKey = getDefaultKey(PUBLISHABLE_KEYS_RAW);
  if (!expectedPublishableKey || req.headers.get("apikey") !== expectedPublishableKey) {
    return Response.json({ error: "Unauthorized webhook" }, { status: 401, headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const record = payload?.record;

    if (!record?.id || payload?.type !== "INSERT" || payload?.table !== "registration_requests") {
      return Response.json({ ok: true, ignored: true }, { headers: corsHeaders });
    }

    const secretKey = getDefaultKey(SECRET_KEYS_RAW);
    if (!secretKey) return Response.json({ error: "Supabase secret key is unavailable" }, { status: 500, headers: corsHeaders });

    const admin = createClient(SUPABASE_URL, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: registration, error: registrationError } = await admin
      .from("registration_requests")
      .select("id,user_id,requested_role,status,created_at,email_notified_at")
      .eq("id", record.id)
      .maybeSingle();

    if (registrationError) throw registrationError;
    if (!registration || registration.status !== "pending" || registration.email_notified_at) {
      return Response.json({ ok: true, ignored: true }, { headers: corsHeaders });
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("full_name,email,username,requested_role")
      .eq("id", registration.user_id)
      .maybeSingle();

    if (profileError) throw profileError;

    const name = profile?.full_name || profile?.username || "User baru";
    const email = profile?.email || "Email tidak tersedia";
    const role = profile?.requested_role || registration.requested_role || "Belum dipilih";
    const createdAt = registration.created_at
      ? new Date(registration.created_at).toLocaleString("id-ID", {
          timeZone: "Asia/Jakarta",
          dateStyle: "full",
          timeStyle: "medium",
        })
      : "-";

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#173d38">
        <h2>AIKON — Registrasi User Baru</h2>
        <p>Ada user baru yang menunggu persetujuan Admin.</p>
        <table style="border-collapse:collapse;width:100%;margin:20px 0">
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Nama</td><td style="padding:8px;border:1px solid #ddd">${name}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Email</td><td style="padding:8px;border:1px solid #ddd">${email}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Role</td><td style="padding:8px;border:1px solid #ddd">${role}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Waktu registrasi</td><td style="padding:8px;border:1px solid #ddd">${createdAt} WIB</td></tr>
        </table>
        <p>User belum dapat masuk sampai Admin melakukan <strong>Accept</strong>.</p>
        <p><a href="https://koalskiii.github.io/AI-Konstruksi/" style="display:inline-block;padding:10px 16px;background:#0e302d;color:#fff;text-decoration:none;border-radius:6px">Buka AIKON</a></p>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "AIKON <onboarding@resend.dev>",
        to: ["aikonmadaa@gmail.com"],
        subject: `[AIKON] Registrasi baru menunggu approval — ${name}`,
        html,
      }),
    });

    const resendData = await resendResponse.json();
    if (!resendResponse.ok) {
      console.error("Resend error", resendData);
      return Response.json({ error: "Resend rejected the email", details: resendData }, { status: 502, headers: corsHeaders });
    }

    await admin.from("registration_requests")
      .update({
        email_notified_at: new Date().toISOString(),
        email_notification_id: resendData?.id ?? null,
      })
      .eq("id", registration.id);

    return Response.json({ ok: true, email_id: resendData?.id ?? null }, { headers: corsHeaders });
  } catch (error) {
    console.error("notify-registration error", error);
    return Response.json({ error: String(error?.message ?? error) }, { status: 500, headers: corsHeaders });
  }
});
