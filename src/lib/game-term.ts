import { z } from "zod";

export const REGIONAL_GAME_TERMS = ["Baba", "Rachão", "Pelada", "Outro"] as const;
export const gameTermSchema = z.string().trim().min(2, "Digite pelo menos 2 caracteres").max(30, "Use até 30 caracteres").regex(/^[^\p{Cc}<>]+$/u, "Nome inválido");

export function gameListLabels(term: string | null) {
  const name = term?.trim() || 'Pelada';
  const plural = /s$/i.test(name) ? name : /ão$/i.test(name) ? name.replace(/ão$/i, 'ões') : `${name}s`;
  const feminine = /a$/i.test(name);
  return { plural, active: `${plural} ${feminine ? 'ativas' : 'ativos'}`, fixed: `${plural} ${feminine ? 'fixas' : 'fixos'}` };
}