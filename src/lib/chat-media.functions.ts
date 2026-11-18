import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const getGroupMedia = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ peladaId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.from('pelada_group_messages').select('id, attachment_url').eq('pelada_id', data.peladaId).eq('kind', 'image').is('deleted_at', null).limit(500);
    if (error) throw new Error('Não foi possível carregar as fotos');
    const result: Record<string, string> = {};
    for (const row of rows ?? []) {
      if (!row.attachment_url) continue;
      try {
        const parsed = new URL(row.attachment_url);
        const match = /^\/storage\/v1\/object\/(?:sign|authenticated|public)\/chat\/(.+)$/.exec(parsed.pathname);
        if (!match?.[1]) continue;
        const path = decodeURIComponent(match[1]);
        if (path.includes('..')) continue;
        const { data: signed } = await context.supabase.storage.from('chat').createSignedUrl(path, 60);
        if (signed) result[row.id] = signed.signedUrl;
      } catch { continue; }
    }
    return result;
  });