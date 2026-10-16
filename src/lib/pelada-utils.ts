import { GAME_MODALITIES } from "./game-modalities";

export const FIELD_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  GAME_MODALITIES.map(({ id, label }) => [id, label]),
);

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

export const WEEKDAY_LABEL: string[] = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
];

const BR_TZ = "America/Sao_Paulo";

/** Date parts (YYYY-MM-DD) of a moment in Brazilian time. */
export function brDateString(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: BR_TZ });
}

export function brWeekday(d: Date): number {
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const short = d.toLocaleDateString("en-US", { timeZone: BR_TZ, weekday: "short" });
  return map[short] ?? d.getDay();
}

export function brTimeString(d: Date): string {
  return d.toLocaleTimeString("en-GB", { timeZone: BR_TZ, hour: "2-digit", minute: "2-digit" });
}

/**
 * Next occurrence (as ISO string) of `weekday` at `timeOfDay` ("HH:MM"),
 * strictly in the future, using Brazilian time.
 */
export function nextOccurrenceISO(weekday: number, timeOfDay: string, from: Date = new Date()) {
  const hhmm = timeOfDay.slice(0, 5);
  for (let i = 0; i <= 14; i++) {
    const probe = new Date(from.getTime() + i * 86400000);
    if (brWeekday(probe) !== weekday) continue;
    const candidate = new Date(`${brDateString(probe)}T${hhmm}:00-03:00`);
    if (candidate.getTime() > from.getTime()) {
      return { iso: candidate.toISOString(), date: brDateString(probe) };
    }
  }
  return null;
}

export const MAX_SLOTS: Record<string, number> = { campo: 30, society: 21, futsal: 16 };
export const maxSlotsFor = (field: string) => MAX_SLOTS[field] ?? 30;
