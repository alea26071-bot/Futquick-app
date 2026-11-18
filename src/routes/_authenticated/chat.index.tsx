import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { MessageCircle, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat/")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Conversas | Futquick" },
    { name: "description", content: "Suas conversas com jogadores e organizadores no Futquick." },
    { property: "og:title", content: "Conversas | Futquick" },
    { property: "og:description", content: "Suas conversas com jogadores e organizadores no Futquick." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ChatListPage,
});

function ChatListPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ["chat-threads", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_threads")
        .select("id, pelada_id, organizer_id, player_id, last_message, last_message_at, peladas(name, photo_url)")
        .or(`organizer_id.eq.${user.id},player_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Collect the "other user" ids to hydrate names/avatars
  const otherIds = Array.from(
    new Set(threads.map((t) => (t.organizer_id === user.id ? t.player_id : t.organizer_id))),
  );

  const { data: profiles = {} } = useQuery({
    queryKey: ["profiles-map", otherIds.sort().join(",")],
    enabled: otherIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, name, avatar_url").in("id", otherIds);
      const map: Record<string, { name: string | null; avatar_url: string | null }> = {};
      for (const p of data ?? []) map[p.id] = { name: p.name, avatar_url: p.avatar_url };
      return map;
    },
  });

  // Realtime: refresh on any new thread activity involving me
  useEffect(() => {
    const channel = supabase
      .channel(`chat-threads-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_threads" }, () => {
        qc.invalidateQueries({ queryKey: ["chat-threads", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc, user.id]);

  return (
    <div className="min-h-screen bg-navy pb-28 flex flex-col">
      <header className="pt-12 px-5 pb-4">
        <h1 className="text-3xl font-display font-extrabold italic uppercase text-white">Chat</h1>
        <p className="text-white/50 text-sm mt-1">Converse com organizadores das peladas.</p>
      </header>

      <main className="flex-1 px-5 pt-2">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-navy-soft/50 animate-pulse" />
            ))}
          </div>
        ) : threads.length === 0 ? (
          <div className="mt-12 text-center px-6 py-12 bg-navy-soft/40 rounded-3xl border border-white/5">
            <div className="size-16 rounded-full bg-cyan/10 grid place-items-center mx-auto mb-4">
              <MessageCircle className="size-7 text-cyan" strokeWidth={2.5} />
            </div>
            <h3 className="font-display font-extrabold italic uppercase text-white text-xl">
              Nenhuma conversa ainda
            </h3>
            <p className="text-white/50 text-sm mt-2">
              Abra uma pelada e toque em "Falar com organizador" para começar.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map((t) => {
              const otherId = t.organizer_id === user.id ? t.player_id : t.organizer_id;
              const other = profiles[otherId];
              const pelada = t.peladas as any;
              return (
                <Link
                  key={t.id}
                  to="/chat/$threadId"
                  params={{ threadId: t.id }}
                  className="flex items-center gap-3 p-3 bg-navy-soft rounded-2xl border border-white/5 active:scale-[0.98] transition-transform"
                >
                  <div className="size-12 rounded-full bg-cyan/20 grid place-items-center overflow-hidden flex-none">
                    {other?.avatar_url ? (
                      <img src={other.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-cyan font-bold">{(other?.name ?? "?")[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center gap-2">
                      <p className="font-bold text-white truncate">{other?.name ?? "Jogador"}</p>
                      <span className="text-[10px] text-white/40 flex-none">
                        {t.last_message_at ? new Date(t.last_message_at).toLocaleDateString("pt-BR") : ""}
                      </span>
                    </div>
                    <p className="text-xs text-cyan/80 truncate">{pelada?.name ?? "Pelada"}</p>
                    <p className="text-xs text-white/50 truncate">{t.last_message ?? "Diga oi 👋"}</p>
                  </div>
                  <ChevronRight className="size-5 text-white/30" />
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
