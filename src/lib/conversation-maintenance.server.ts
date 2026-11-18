import { conversationWindow } from './conversation-window';

/** Storage is deleted first; failures leave source rows available for retry. */
export async function maintainConversations() {
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  const { error: maintenanceError } = await db.rpc('pelada_group_maintenance');
  if (maintenanceError) throw new Error('Falha na manutenção de solicitações');
  const { data: games, error } = await db.from('peladas').select('id, starts_at, duration_minutes, chat_purged_at').is('chat_purged_at', null).lt('starts_at', new Date(Date.now() - 86400000).toISOString()).order('starts_at').limit(100);
  if (error) throw new Error('Falha ao consultar conversas vencidas');
  let purged = 0;
  for (const game of games ?? []) {
    if (conversationWindow(game).expiresAt > Date.now()) continue;
    const { data: claimed, error: claimError } = await db.rpc('claim_expired_conversation', { _pelada_id: game.id });
    if (claimError || !claimed) continue;
    const { data: groups, error: groupError } = await db.from('pelada_group_messages').select('attachment_url').eq('pelada_id', game.id);
    const { data: threads, error: threadError } = await db.from('chat_threads').select('id').eq('pelada_id', game.id);
    if (groupError || threadError) continue;
    const urls = new Set((groups ?? []).map(m => m.attachment_url).filter((url): url is string => !!url));
    if (threads?.length) {
      const { data: messages, error: messageError } = await db.from('chat_messages').select('attachment_url').in('thread_id', threads.map(t => t.id));
      if (messageError) continue;
      for (const message of messages ?? []) if (message.attachment_url) urls.add(message.attachment_url);
    }
    let failed = false;
    for (const url of urls) {
      const path = chatObjectPath(url);
      if (!path) { failed = true; break; }
      // Keep shared files if referenced by another conversation or feature.
      const [otherGroups, otherMessages, reports, photos, covers] = await Promise.all([
        db.from('pelada_group_messages').select('id').eq('attachment_url', url).neq('pelada_id', game.id).limit(1),
        db.from('chat_messages').select('thread_id, chat_threads(pelada_id)').eq('attachment_url', url),
        db.from('reports').select('id').eq('message_body', url).limit(1),
        db.from('peladas').select('id').eq('photo_url', url).limit(1),
        db.from('profiles').select('id').eq('avatar_url', url).limit(1),
      ]);
      if ([otherGroups, otherMessages, reports, photos, covers].some(r => r.error)) { failed = true; break; }
      const sharedMessage = otherMessages.data?.some(m => m.chat_threads?.pelada_id !== game.id);
      if (otherGroups.data?.length || sharedMessage || reports.data?.length || photos.data?.length || covers.data?.length) continue;
      const { error: removeError } = await db.storage.from('chat').remove([path]);
      if (removeError) { failed = true; break; }
    }
    if (failed) continue;
    const { data: removed, error: purgeError } = await db.rpc('purge_expired_conversation', { _pelada_id: game.id });
    if (!purgeError && removed) purged++;
  }
  const { data: pruned, error: pruneError } = await db.rpc('prune_inactive_templates');
  if (pruneError) throw new Error('Falha ao limpar recorrências inativas');
  return { purged, pruned: pruned ?? 0 };
}

export function chatObjectPath(url: string) {
  try {
    const parsed = new URL(url);
    const origins = [process.env['VITE_SUPABASE_URL'], process.env['SUPABASE_URL']].filter((v): v is string => !!v).map(v => new URL(v).origin);
    if (!origins.includes(parsed.origin)) return null;
    const match = /^\/storage\/v1\/object\/(?:sign|authenticated|public)\/chat\/(.+)$/.exec(parsed.pathname);
    const path = match?.[1] ? decodeURIComponent(match[1]) : null;
    return path && !path.includes('..') ? path : null;
  } catch { return null; }
}