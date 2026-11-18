export const CONVERSATION_MARGIN_MS = 24 * 60 * 60 * 1000;
export function conversationWindow(game: { starts_at: string; duration_minutes: number; chat_purged_at?: string | null; chat_cleanup_started_at?: string | null }, now = Date.now()) {
  const start = Date.parse(game.starts_at);
  const opensAt = start - CONVERSATION_MARGIN_MS;
  const expiresAt = start + game.duration_minutes * 60000 + CONVERSATION_MARGIN_MS;
  return { opensAt, expiresAt, open: !game.chat_purged_at && !game.chat_cleanup_started_at && now >= opensAt && now < expiresAt };
}