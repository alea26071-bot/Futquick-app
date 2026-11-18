import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { reputationInput, starsScore, postureScore } from './reputation';
export const confirmAttendance = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
.inputValidator(z.object({ peladaId: z.string().uuid(), playerId: z.string().uuid() }))
.handler(async ({ data, context }) => {
 const { error } = await context.supabase.rpc('confirm_game_attendance', { _pelada_id: data.peladaId, _user_id: data.playerId });
 if (error) throw new Error('Não foi possível confirmar a presença. Confira a vaga e o término do jogo.');
 return { ok: true };
});
export const saveStars = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
.inputValidator(reputationInput.extend({ score: starsScore }))
.handler(async ({ data, context }) => {
 const { error } = await context.supabase.rpc('submit_game_stars', { _pelada_id: data.peladaId, _rated_id: data.playerId, _score: data.score });
 if (error) throw new Error('Não foi possível registrar as estrelas. Confira a presença e se a avaliação já foi enviada.');
 return { ok: true };
});
export const savePosture = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
.inputValidator(reputationInput.extend({ score: postureScore }))
.handler(async ({ data, context }) => {
 const { error } = await context.supabase.rpc('submit_game_posture', { _pelada_id: data.peladaId, _rated_id: data.playerId, _score: data.score });
 if (error) throw new Error('Não foi possível registrar a postura. Somente o responsável pode avaliar presentes, uma vez por jogo.');
 return { ok: true };
});
export const pendingRatings = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
 const { data, error } = await context.supabase.rpc('pending_game_ratings');
 if (error) throw new Error('Não foi possível consultar avaliações pendentes.');
 return data ?? [];
});
