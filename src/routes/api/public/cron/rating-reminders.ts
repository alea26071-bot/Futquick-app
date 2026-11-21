import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from '@/integrations/supabase/cron-auth';

async function run() {
  const { attemptSocialPush } = await import("@/lib/social-push.server");
  await attemptSocialPush();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { notifyUser } = await import("@/lib/notifications.server");

  // Attendance may be confirmed later; never infer it from reservations.
  const { data: peladas, error } = await supabaseAdmin
    .from("peladas")
    .select("id, name, organizer_id, starts_at, duration_minutes, status, rating_reminder_sent_at")
    .neq("status", "cancelled")
    .lte("starts_at", new Date().toISOString());
  if (error) return { notified: 0, error: "Não foi possível consultar os jogos" };

  let notified = 0;
  for (const p of peladas ?? []) {
    const endedAt = new Date(p.starts_at).getTime() + p.duration_minutes * 60_000;
    const finished = endedAt <= Date.now();
    if (!finished) continue;

    const { data: players } = await supabaseAdmin
      .from("pelada_attendance")
      .select("user_id")
      .eq("pelada_id", p.id);

    const { data: ratings } = await supabaseAdmin.from("pelada_ratings")
      .select("rater_id,rated_id").eq("pelada_id", p.id).eq("presence_verified", true);

    const url = `/pelada/${p.id}#avaliacoes`;

    if (!p.rating_reminder_sent_at) await notifyUser({
      userId: p.organizer_id,
      type: "rating_reminder",
      title: "Confirme a presença e avalie a postura",
      body: `${p.name} terminou. Registre quem jogou e a postura dos presentes.`,
      url,
      data: { peladaId: p.id },
      dedupeKey: `posture:${p.id}:${p.organizer_id}`,
    });
    notified++;

    for (const pl of players ?? []) {
      const pending = (players ?? []).some(other => other.user_id !== pl.user_id &&
        !(ratings ?? []).some(r => r.rater_id === pl.user_id && r.rated_id === other.user_id));
      if (!pending) continue;
      await notifyUser({
        userId: pl.user_id,
        type: "rating_reminder",
        title: "Avaliações pendentes",
        body: `Avalie os jogadores presentes em ${p.name}.`,
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
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        return Response.json(await run());
      },
    },
  },
});
