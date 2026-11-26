import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { notifyUser } from "@/lib/notifications.server";
import { COPY } from "@/lib/notification-copy";

export async function notifyNearbyPeladaCreated(peladaId: string) {
  const { data: p } = await supabaseAdmin
    .from("peladas")
    .select("id, name, organizer_id, latitude, longitude, status")
    .eq("id", peladaId)
    .maybeSingle();
  if (!p || p.status !== "open" || p.latitude == null || p.longitude == null) return 0;
  let sent = 0;
  let after: string | undefined;
  while (true) {
    const { data: users, error } = await supabaseAdmin.rpc("nearby_recipients", { _pelada_id: p.id, _limit: 500, ...(after ? { _after: after } : {}) });
    if (error) throw new Error("Não foi possível consultar os destinatários dos jogos.");
    for (const u of users ?? []) {
      const result = await notifyUser({
        userId: u.id, type: "nearby_pelada", ...COPY.nearbyPelada(p.name),
        url: `/pelada/${p.id}`, data: { peladaId: p.id }, dedupeKey: `nearby:${p.id}:${u.id}`,
      });
      if (!result.skipped) sent++;
    }
    const last = users?.at(-1);
    if (!last || (users?.length ?? 0) < 500) break;
    after = last.id;
  }
  return sent;
}
