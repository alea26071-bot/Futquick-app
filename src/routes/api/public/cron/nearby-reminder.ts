import { createFileRoute } from "@tanstack/react-router";

async function run() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { notifyUser } = await import("@/lib/notifications.server");
  const { COPY, distanceKm, effectiveRadiusKm } = await import("@/lib/notification-copy");

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

  const today = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - 20 * 3600_000).toISOString();
  let notified = 0;
  for (const u of users ?? []) {
    if (u.latitude == null || u.longitude == null) continue;
    const r = effectiveRadiusKm(u.notify_radius_km);
    const count = (peladas ?? []).filter(
      (p) => p.organizer_id !== u.id && distanceKm(u.latitude!, u.longitude!, p.latitude, p.longitude) <= r,
    ).length;
    if (!count) continue;
    const { count: recent } = await supabaseAdmin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", u.id)
      .in("type", ["nearby_pelada", "nearby_reminder"])
      .gte("created_at", since);
    if (recent) continue;
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
        const key = request.headers.get("apikey");
        const expected = process.env["SUPABASE_ANON_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!expected || key !== expected) return new Response("Unauthorized", { status: 401 });
        return Response.json(await run());
      },
    },
  },
});
