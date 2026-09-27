import { createFileRoute } from "@tanstack/react-router";

async function run() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { notifyUser } = await import("@/lib/notifications.server");

  // Peladas that ended in the last 48h and never got a rating reminder.
  const since = new Date(Date.now() - 48 * 3600_000).toISOString();
  const { data: peladas, error } = await supabaseAdmin
    .from("peladas")
    .select("id, name, organizer_id, starts_at, duration_minutes, status, rating_reminder_sent_at")
    .is("rating_reminder_sent_at", null)
    .gte("starts_at", since);
  if (error) return { notified: 0, error: error.message };

  let notified = 0;
  for (const p of peladas ?? []) {
    const endedAt = new Date(p.starts_at).getTime() + p.duration_minutes * 60_000;
    const finished = p.status === "finished" || endedAt < Date.now();
    if (!finished) continue;

    const { data: players } = await supabaseAdmin
      .from("pelada_requests")
      .select("user_id")
      .eq("pelada_id", p.id)
      .eq("status", "accepted");

    const url = `/pelada/${p.id}`;

    await notifyUser({
      userId: p.organizer_id,
      type: "rating_reminder",
      title: "Avalie os jogadores",
      body: `Como foi a galera na ${p.name}? Deixe as notas agora.`,
      url,
      data: { peladaId: p.id },
      dedupeKey: `rating:${p.id}:${p.organizer_id}`,
    });
    notified++;

    for (const pl of players ?? []) {
      if (pl.user_id === p.organizer_id) continue;
      await notifyUser({
        userId: pl.user_id,
        type: "rating_reminder",
        title: "Como foi a pelada?",
        body: `Avalie a organização da ${p.name} — leva 5 segundos.`,
        url,
        data: { peladaId: p.id },
        dedupeKey: `rating:${p.id}:${pl.user_id}`,
      });
      notified++;
    }

    await supabaseAdmin
      .from("peladas")
      .update({ rating_reminder_sent_at: new Date().toISOString() })
      .eq("id", p.id);
  }

  return { notified };
}

export const Route = createFileRoute("/api/public/cron/rating-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = request.headers.get("apikey");
        const expected = process.env["SUPABASE_ANON_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!expected || key !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        return Response.json(await run());
      },
    },
  },
});
