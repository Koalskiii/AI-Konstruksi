import { withSupabase } from "npm:@supabase/server@^1";
import { sendPushBatch } from "npm:@mmmike/web-push@1.3.0/send";

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    const body = await req.json().catch(() => ({}));
    const userIds = Array.isArray(body.user_ids) ? body.user_ids : [];
    const notification = body.notification || {};

    if (!userIds.length) return Response.json({ delivered: 0, message: "No recipients." });

    const publicKey = Deno.env.get("AIKON_VAPID_PUBLIC_KEY");
    const privateKey = Deno.env.get("AIKON_VAPID_PRIVATE_KEY");
    const subject = Deno.env.get("AIKON_VAPID_SUBJECT") || "https://koalskiii.github.io/AI-Konstruksi/";

    if (!publicKey || !privateKey) {
      return Response.json({ delivered: 0, configured: false, message: "VAPID secrets are not configured." });
    }

    const { data: subscriptions, error } = await ctx.supabaseAdmin
      .from("push_subscriptions")
      .select("id,user_id,endpoint,p256dh,auth")
      .in("user_id", userIds);

    if (error) throw error;

    const payload = {
      title: notification.title || "AIKON — Pemberitahuan",
      body: notification.body || "Ada pembaruan pemeriksaan aset.",
      url: notification.url || "/AI-Konstruksi/#history",
      tag: notification.tag || "aikon-asset-missing"
    };

    const vapid = { publicKey, privateKey, subject };
    const pushSubscriptions = (subscriptions || []).map(row => ({
      endpoint: row.endpoint,
      keys: { p256dh: row.p256dh, auth: row.auth }
    }));

    const result = await sendPushBatch(pushSubscriptions, payload, vapid, { urgency: "high", ttl: 86400 });

    const gone = new Set(result.gone.map(sub => sub.endpoint));
    if (gone.size) {
      await ctx.supabaseAdmin.from("push_subscriptions").delete().in("endpoint", [...gone]);
    }

    return Response.json({
      configured: true,
      delivered: result.delivered,
      gone: result.gone.length,
      failed: result.failed.length
    });
  })
};