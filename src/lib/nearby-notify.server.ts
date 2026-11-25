import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { notifyUser } from "@/lib/notifications.server";
import { COPY, NEARBY_MAX_KM, distanceKm, effectiveRadiusKm } from "@/lib/notification-copy";

type Point = { latitude: number; longitude: number };

/** Usuários com localização dentro do raio (raio do usuário; qualquer distância = teto NEARBY_MAX_KM) do ponto. */
export async function usersNear(p: Point, excludeId?: string) {
  const dLat = NEARBY_MAX_KM / 111;
  const dLng = NEARBY_MAX_KM / (111 * Math.max(Math.cos((p.latitude * Math.PI) / 180), 0.1));
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, latitude, longitude, notify_radius_km, suspended_at")
    .gte("latitude", p.latitude - dLat)
    .lte("latitude", p.latitude + dLat)
    .gte("longitude", p.longitude - dLng)
    .lte("longitude", p.longitude + dLng)
    .is("suspended_at", null)
    .limit(2000);
  return (data ?? []).filter(
    (u) =>
      u.id !== excludeId &&
      u.latitude != null &&
      u.longitude != null &&
      distanceKm(p.latitude, p.longitude, u.latitude, u.longitude) <= effectiveRadiusKm(u.notify_radius_km),
  );
}

export async function notifyNearbyPeladaCreated(peladaId: string) {
  const { data: p } = await supabaseAdmin
    .from("peladas")
    .select("id, name, organizer_id, latitude, longitude, status")
    .eq("id", peladaId)
    .maybeSingle();
  if (!p || p.status !== "open" || p.latitude == null || p.longitude == null) return 0;
  const users = await usersNear({ latitude: p.latitude, longitude: p.longitude }, p.organizer_id);
  let sent = 0;
  for (const u of users) {
    const { data: blocked } = await supabaseAdmin.rpc("is_blocked", { _a: u.id, _b: p.organizer_id });
    if (blocked) continue;
    await notifyUser({
      userId: u.id,
      type: "nearby_pelada",
      ...COPY.nearbyPelada(p.name),
      url: `/pelada/${p.id}`,
      dedupeKey: `nearby:${p.id}:${u.id}`,
    });
    sent++;
  }
  return sent;
}
