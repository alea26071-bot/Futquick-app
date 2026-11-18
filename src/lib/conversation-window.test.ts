import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { conversationWindow } from './conversation-window';
const game = { starts_at: '2026-11-18T20:00:00-03:00', duration_minutes: 90 };
describe('conversation deadlines', () => {
  it('opens exactly 24 hours before kickoff', () => {
    assert.equal(conversationWindow(game, Date.parse('2026-11-17T22:59:59Z')).open, false);
    assert.equal(conversationWindow(game, Date.parse('2026-11-17T23:00:00Z')).open, true);
  });
  it('stays open during and for 24 hours after the 90 minute game', () => {
    assert.equal(conversationWindow(game, Date.parse('2026-11-19T00:30:00Z')).open, true);
    assert.equal(conversationWindow(game, Date.parse('2026-11-20T00:29:59Z')).open, true);
    assert.equal(conversationWindow(game, Date.parse('2026-11-20T00:30:00Z')).open, false);
  });
  it('handles equivalent local and UTC instants identically', () => {
    assert.deepEqual(conversationWindow(game), conversationWindow({ ...game, starts_at: '2026-11-18T23:00:00Z' }));
  });
  it('cannot reopen a purged conversation by postponing the game', () => {
    assert.equal(conversationWindow({ ...game, chat_purged_at: '2026-11-17T00:00:00Z' }, Date.parse(game.starts_at)).open, false);
  });
  it('blocks a conversation claimed for deletion', () => {
    assert.equal(conversationWindow({ ...game, chat_cleanup_started_at: '2026-11-17T00:00:00Z' }, Date.parse(game.starts_at)).open, false);
  });
});