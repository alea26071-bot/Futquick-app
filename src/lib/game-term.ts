import { z } from "zod";

export const REGIONAL_GAME_TERMS = ["Baba", "Rachão", "Pelada", "Outro"] as const;
export const gameTermSchema = z.string().trim().min(2, "Digite pelo menos 2 caracteres").max(30, "Use até 30 caracteres").regex(/^[^\p{Cc}<>]+$/u, "Nome inválido");