import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  ssr: false,
  component: ChatThreadPage,
});

function ChatThreadPage() {
  const { threadId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: thread } = useQuery({
    queryKey: ["chat-thread", threadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_threads")
        .select("id, pelada_id, organizer_id, player_id, peladas(name)")
        .eq("id", threadId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const otherId = thread
    ? thread.organizer_id === user.id
      ? thread.player_id
      : thread.organizer_id
    : null;

  const { data: other } = useQuery({
    queryKey: ["profile", otherId],
    enabled: !!otherId,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, name, avatar_url").eq("id", otherId!).maybeSingle();
      return data;
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["chat-messages", threadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`chat-messages-${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          qc.setQueryData(["chat-messages", threadId], (prev: any[] = []) => {
            if (prev.some((m) => m.id === (payload.new as any).id)) return prev;
            return [...prev, payload.new];
          });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [threadId, qc]);

  // Autoscroll
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const { error } = await supabase.from("chat_messages").insert({
      thread_id: threadId,
      sender_id: user.id,
      body,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setText("");
    inputRef.current?.focus();
  };

  return (
    <div className="h-screen bg-navy flex flex-col">
      <header className="pt-12 px-4 pb-3 flex items-center gap-3 border-b border-white/10 bg-navy-soft">
        <button onClick={() => navigate({ to: "/chat" })} className="size-10 rounded-full grid place-items-center">
          <ArrowLeft className="size-5 text-white" />
        </button>
        <div className="size-10 rounded-full bg-cyan/20 grid place-items-center overflow-hidden flex-none">
          {other?.avatar_url ? (
            <img src={other.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-cyan font-bold">{(other?.name ?? "?")[0]?.toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-white font-bold truncate">{other?.name ?? "..."}</p>
          <p className="text-xs text-cyan/70 truncate">{(thread?.peladas as any)?.name ?? ""}</p>
        </div>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-white/40 text-sm mt-8">Comece a conversa 👋</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === user.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                mine ? "bg-cyan text-navy rounded-br-sm" : "bg-navy-soft text-white rounded-bl-sm border border-white/5"
              }`}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`text-[10px] mt-1 ${mine ? "text-navy/60" : "text-white/40"}`}>
                  {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="p-3 border-t border-white/10 bg-navy-soft flex items-center gap-2 pb-safe"
      >
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mensagem..."
          maxLength={2000}
          className="flex-1 px-4 py-3 rounded-full bg-navy border border-white/10 text-white text-sm focus:border-cyan outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="size-11 rounded-full bg-cyan text-navy grid place-items-center disabled:opacity-30 active:scale-95 transition-transform"
          aria-label="Enviar"
        >
          <Send className="size-5" strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}
