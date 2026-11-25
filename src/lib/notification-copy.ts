// Textos das notificações push — troque aqui pelas frases definitivas.
/** Raio escolhido (2/5/10 km) é respeitado; "qualquer distância" usa este teto só para push, evitando avisos de outras cidades. */
export const NEARBY_MAX_KM = 25;
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
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Raio efetivo do usuário: o escolhido, limitado a 5 km. */
export function effectiveRadiusKm(chosen: number | null | undefined): number {
  if (chosen == null) return NEARBY_MAX_KM;
  return (NOTIFY_RADIUS_CHOICES as readonly number[]).includes(chosen) ? chosen : Math.min(Math.max(chosen, 0), NEARBY_MAX_KM);
}

/** Início do dia em São Paulo (UTC-3), usado para "um aviso por dia". */
export function saoPauloDayStart(now: Date = new Date()): { day: string; startIso: string } {
  const local = new Date(now.getTime() - 3 * 3600_000);
  const day = local.toISOString().slice(0, 10);
  return { day, startIso: new Date(`${day}T03:00:00.000Z`).toISOString() };
}
