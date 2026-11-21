import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

async function run() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { notifyUser } = await import("@/lib/notifications.server");
  const { COPY, distanceKm, effectiveRadiusKm, saoPauloDayStart } = await import("@/lib/notification-copy");

  const { data: peladas } = await supabaseAdmin
    .from("peladas")
    .select("id, latitude, longitude, organizer_id")
    .eq("status", "open")
    .gt("starts_at", new Date().toISOString())
    .limit(1000);
  const { data: users } = await supabaseAdmin
    .from("profiles")
    .select("id, latitude, longitude, notify_radius_km")
    .not("latitude", "is", null)
    .is("suspended_at", null)
    .limit(5000);

  const { day: today, startIso: since } = saoPauloDayStart();
  let notified = 0;
  for (const u of users ?? []) {
    if (u.latitude == null || u.longitude == null) continue;
    const r = effectiveRadiusKm(u.notify_radius_km);
    const near = (peladas ?? []).filter(
      (p) => p.organizer_id !== u.id && distanceKm(u.latitude!, u.longitude!, p.latitude, p.longitude) <= r,
    );
    if (!near.length) continue;
    // Um aviso por dia: pula quem já recebeu qualquer notificação hoje (horário de Brasília).
    const { count: recent } = await supabaseAdmin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", u.id)
      .gte("created_at", since);
    if (recent) continue;
    let count = 0;
    for (const p of near) {
      const { data: blocked } = await supabaseAdmin.rpc("is_blocked", { _a: u.id, _b: p.organizer_id });
      if (!blocked) count++;
    }
    if (!count) continue;
    await notifyUser({
      userId: u.id,
      type: "nearby_reminder",
      ...COPY.nearbyReminder(count),
      url: "/descobrir",
      dedupeKey: `nearby-reminder:${today}`,
    });
    notified++;
  }
  return { notified };
}

export const Route = createFileRoute("/api/public/cron/nearby-reminder")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        return Response.json(await run());
      },
    },
  },
});
