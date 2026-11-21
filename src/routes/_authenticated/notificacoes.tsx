import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { ArrowLeft, Bell, BellOff, BellRing, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { enablePush, disablePush, pushPermission, type PushState } from "@/lib/push-client";
import { FollowActivityPreference } from "@/components/FollowActivityPreference";

export const Route = createFileRoute("/_authenticated/notificacoes")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Notificações · Futquick" },
      { name: "description", content: "Solicitações, confirmações e mensagens das suas peladas no Futquick." },
      { property: "og:title", content: "Notificações · Futquick" },
      { property: "og:description", content: "Acompanhe solicitações e confirmações das suas peladas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [permission, setPermission] = useState<PushState>("default");
  const [busy, setBusy] = useState(false);

  useEffect(() => setPermission(pushPermission()), []);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["notifications", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Mark everything as read once seen
  useEffect(() => {
    if (items.some((n) => !n.read_at)) {
      supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null)
        .then(() => qc.invalidateQueries({ queryKey: ["notifications-unread", user.id] }));
    }
  }, [items, qc, user.id]);

  useEffect(() => {
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["notifications", user.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, user.id]);

  const togglePush = async () => {
    setBusy(true);
    try {
      if (permission === "granted") {
        await disablePush();
        setPermission("default");
        toast.success("Notificações desativadas neste aparelho.");
      } else {
        const state = await enablePush();
        setPermission(state);
        if (state === "granted") toast.success("Notificações ativadas! ⚽");
        else if (state === "denied") toast.error("Permissão bloqueada nas configurações do navegador.");
        else if (state === "unsupported") toast.error("Este aparelho não suporta notificações push.");
        else toast.error("Não conseguimos ativar agora. Tente de novo.");
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  return (
    <div className="min-h-screen bg-navy pb-28">
      <header className="pt-12 px-5 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/descobrir" })}
          className="size-10 rounded-full bg-navy-soft border border-white/10 grid place-items-center"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-5 text-white" />
        </button>
        <h1 className="text-2xl font-display font-extrabold italic uppercase text-white">Notificações</h1>
      </header>

      <main className="px-5 space-y-4">
        <button
          onClick={togglePush}
          disabled={busy || permission === "unsupported"}
          className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left disabled:opacity-50 ${
            permission === "granted" ? "bg-cyan/10 border-cyan/40" : "bg-navy-soft border-white/10"
          }`}
        >
          {permission === "granted" ? (
            <BellRing className="size-5 text-cyan flex-none" />
          ) : (
            <BellOff className="size-5 text-white/60 flex-none" />
          )}
          <div className="min-w-0">
            <p className="text-white font-bold text-sm">
              {permission === "granted" ? "Push ativo neste aparelho" : "Ativar notificações push"}
            </p>
            <p className="text-xs text-white/50">
              {permission === "granted"
                ? "Você recebe avisos de solicitações, confirmações e mensagens."
                : "Receba avisos na hora, mesmo com o app fechado."}
            </p>
          </div>
        </button>

        <FollowActivityPreference userId={user.id} />

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-navy-soft/50 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-10 text-center px-6 py-12 bg-navy-soft/40 rounded-3xl border border-white/5">
            <div className="size-16 rounded-full bg-cyan/10 grid place-items-center mx-auto mb-4">
              <Bell className="size-7 text-cyan" strokeWidth={2.5} />
            </div>
            <h3 className="font-display font-extrabold italic uppercase text-white text-xl">Tudo tranquilo</h3>
            <p className="text-white/50 text-sm mt-2">Suas solicitações e confirmações aparecem aqui.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-2xl border flex gap-3 items-start ${
                  n.read_at ? "bg-navy-soft/50 border-white/5" : "bg-navy-soft border-cyan/30"
                }`}
              >
                <button
                  onClick={() => n.url && navigate({ href: n.url })}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-white font-bold text-sm">{n.title}</p>
                  {n.body && <p className="text-white/60 text-xs mt-1">{n.body}</p>}
                  <p className="text-[10px] text-white/30 mt-2 font-mono uppercase">
                    {new Date(n.created_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </button>
                <button onClick={() => remove(n.id)} aria-label="Excluir" className="p-2">
                  <Trash2 className="size-4 text-white/30" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
