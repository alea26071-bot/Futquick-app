export const FIELD_TYPE_LABEL: Record<string, string> = {
  society: "Society",
  campo: "Campo",
  futsal: "Futsal",
};

export const LEVEL_LABEL: Record<string, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

export function formatPrice(cents: number): string {
  if (!cents || cents === 0) return "Grátis";
  return `R$ ${(cents / 100).toFixed(0)}`;
}

export function formatMatchDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Hoje · ${time}`;
  if (isTomorrow) return `Amanhã · ${time}`;
  return `${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} · ${time}`;
}

export function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const mins = Math.round(diff / 60000);
  if (mins < 0) return "Em andamento";
  if (mins < 60) return `Em ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Em ${hours}h`;
  const days = Math.round(hours / 24);
  return `Em ${days}d`;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
