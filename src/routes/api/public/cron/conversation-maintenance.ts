import { createFileRoute } from '@tanstack/react-router';
import { authenticateCronRequest } from '@/integrations/supabase/cron-auth';

export const Route = createFileRoute('/api/public/cron/conversation-maintenance')({
  server: { handlers: { POST: async ({ request }) => {
    const denied = await authenticateCronRequest(request);
    if (denied) return denied;
    const { maintainConversations } = await import('@/lib/conversation-maintenance.server');
    try { return Response.json(await maintainConversations()); }
    catch { return Response.json({ error: 'Falha na manutenção; será tentada novamente.' }, { status: 500 }); }
  } } },
});