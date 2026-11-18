import { z } from 'zod';
export const starsScore = z.number().int().min(1).max(5);
export const postureScore = z.number().int().min(0).max(100);
export const reputationInput = z.object({ peladaId: z.string().uuid(), playerId: z.string().uuid(), score: z.number().int() });
export function reputationValue(value: number | null | undefined, posture = false) {
  return value == null ? '—' : posture ? `${Math.round(value)}%` : Number(value).toFixed(1);
}
