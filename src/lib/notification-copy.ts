// Textos das notificações push — troque aqui pelas frases definitivas.
/** Preferência do perfil: null = sem limite geográfico; ausência/valor inválido falha fechado. */
export const NOTIFY_RADIUS_CHOICES = [2, 5, 10] as const;

/** Convite único para ativar o push após o cadastro. */
export const PUSH_PROMPT = {
  title: "Ativar notificações?",
  body: "Receba avisos de jogos perto de você e de novas mensagens.",
  action: "Ativar",
};

export const COPY = {
  nearbyPelada: (name: string) => ({
    title: "Nova pelada perto de você ⚽",
    body: `${name} acabou de ser criada a poucos km de você. Garanta sua vaga!`,
  }),
  // Genérico de propósito: sem remetente nem prévia do conteúdo.
  newMessage: () => ({
    title: "Você tem uma nova mensagem",
    body: "Toque para abrir a conversa.",
  }),
  nearbyReminder: (count: number) => ({
    title: "Verifique as peladas próximas de você",
    body: count === 1 ? "Tem 1 pelada aberta perto de você." : `Tem ${count} peladas abertas perto de você.`,
  }),
};

/** Distância em km entre dois pontos (Haversine). */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const dLat = r(bLat - aLat);
  const dLng = r(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

/** null não é ausência de preferência: significa Qualquer distância. */
export function effectiveRadiusKm(chosen: number | null | undefined): number {
  if (chosen === null) return Infinity;
  return typeof chosen === "number" && (NOTIFY_RADIUS_CHOICES as readonly number[]).includes(chosen) ? chosen : 0;
}

export function withinPreferredRadius(radius: number | null | undefined, aLat: number | null, aLng: number | null, bLat: number, bLng: number): boolean {
  if (radius === null) return true;
  if (aLat === null || aLng === null || ![aLat, aLng, bLat, bLng].every(Number.isFinite) || Math.abs(aLat) > 90 || Math.abs(bLat) > 90 || Math.abs(aLng) > 180 || Math.abs(bLng) > 180) return false;
  const limit = effectiveRadiusKm(radius);
  return limit > 0 && distanceKm(aLat, aLng, bLat, bLng) <= limit;
}

/** Até três pushes de novas peladas por dia; demais jogos continuam no app e no feed. */
export function shouldSendNearbyPush(previousToday: number): boolean { return previousToday < 3; }

/** Início do dia em São Paulo (UTC-3), usado para "um aviso por dia". */
export function saoPauloDayStart(now: Date = new Date()): { day: string; startIso: string } {
  const local = new Date(now.getTime() - 3 * 3600_000);
  const day = local.toISOString().slice(0, 10);
  return { day, startIso: new Date(`${day}T03:00:00.000Z`).toISOString() };
}
