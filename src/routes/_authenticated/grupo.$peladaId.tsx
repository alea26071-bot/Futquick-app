import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Send, Info, MoreVertical, Lock, Image as ImageIcon, BellOff, Bell, Navigation, Crown, LogOut } from "lucide-react";
import { toast } from "sonner";
import { notifyGroupMessage, leavePelada } from "@/lib/pelada-group.functions";
import { uploadUserPhoto } from "@/lib/storage-helpers";
import { ReportSheet, type ReportTarget } from "@/components/ReportSheet";
import { PeladaPlayersSection } from "@/components/PeladaPlayersSheet";
import { GoogleMap } from "@/components/GoogleMap";
import { formatMatchDate } from "@/lib/pelada-utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/grupo/$peladaId")({
  ssr: false,
  head: () => ({ meta: [{ title: "Grupo da pelada — Futquick" }] }),
  component: GroupChatPage,
});

type Msg = {
  id: string;
  sender_id: string;
  body: string;
  kind: string;
  attachment_url: string | null;
  deleted_at: string | null;
  created_at: string;
};

function GroupChatPage() {
  const { peladaId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const notify = useServerFn(notifyGroupMessage);
  const leave = useServerFn(leavePelada);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [report, setReport] = useState<ReportTarget | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: pelada } = useQuery({
    queryKey: ["pelada", peladaId],
    queryFn: async () => {
      const { data, error } = await supabase.from("peladas").select("*").eq("id", peladaId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: isMember, isLoading: checking } = useQuery({
    queryKey: ["pelada-member", peladaId, user.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_pelada_member", { _pelada_id: peladaId, _user_id: user.id });
      return !!data;
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["group-messages", peladaId],
    enabled: !!isMember,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pelada_group_messages")
        .select("id, sender_id, body, kind, attachment_url, deleted_at, created_at")
        .eq("pelada_id", peladaId)
        .order("created_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Msg[];
    },
  });

  const senderIds = Array.from(new Set(messages.map((m) => m.sender_id)));
  const { data: senders = {} } = useQuery({
    queryKey: ["group-senders", peladaId, senderIds.sort().join(",")],
    enabled: senderIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, name, avatar_url").in("id", senderIds);
      return Object.fromEntries((data ?? []).map((p) => [p.id, p]));
    },
  });

  const { data: muted = false } = useQuery({
    queryKey: ["pelada-mute", peladaId, user.id],
    queryFn: async () => {
      const { data } = await supabase.from("pelada_mutes").select("pelada_id").eq("pelada_id", peladaId).eq("user_id", user.id).maybeSingle();
      return !!data;
    },
  });

  useEffect(() => {
    if (!isMember) return;
    const ch = supabase
      .channel(`group-${peladaId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pelada_group_messages", filter: `pelada_id=eq.${peladaId}` }, () =>
        qc.invalidateQueries({ queryKey: ["group-messages", peladaId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [isMember, peladaId, qc]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  const isOrganizer = pelada?.organizer_id === user.id;

  const send = async (payload: { kind: "text" | "image"; body: string; attachment_url?: string }) => {
    setSending(true);
    const { data, error } = await supabase
      .from("pelada_group_messages")
      .insert({ pelada_id: peladaId, sender_id: user.id, ...payload })
      .select("id")
      .single();
    setSending(false);
    if (error) return toast.error("Você não pode enviar mensagens neste grupo.");
    qc.invalidateQueries({ queryKey: ["group-messages", peladaId] });
    notify({ data: { messageId: data.id } }).catch(() => {});
  };

  const sendText = async () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    await send({ kind: "text", body: body.slice(0, 2000) });
  };

  const sendPhoto = async (file: File) => {
    try {
      setSending(true);
      const url = await uploadUserPhoto("chat", user.id, file, `grupo-${peladaId}`);
      await send({ kind: "image", body: "", attachment_url: url });
    } catch (e) {
      setSending(false);
      toast.error(e instanceof Error ? e.message : "Erro ao enviar foto");
    }
  };

  const removeMessage = async (id: string) => {
    setMenuFor(null);
    const { error } = await supabase
      .from("pelada_group_messages")
      .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
      .eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["group-messages", peladaId] });
  };

  const toggleMute = async () => {
    if (muted) await supabase.from("pelada_mutes").delete().eq("pelada_id", peladaId).eq("user_id", user.id);
    else await supabase.from("pelada_mutes").insert({ pelada_id: peladaId, user_id: user.id });
    qc.invalidateQueries({ queryKey: ["pelada-mute", peladaId, user.id] });
    toast.success(muted ? "Notificações ativadas" : "Notificações silenciadas");
  };

  const doLeave = async () => {
    if (!window.confirm("Sair da pelada? Sua vaga será liberada e você perde o acesso ao grupo.")) return;
    try {
      await leave({ data: { peladaId } });
      toast.success("Você saiu da pelada.");
      qc.invalidateQueries();
      navigate({ to: "/pelada/$peladaId", params: { peladaId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao sair");
    }
  };

  if (checking || !pelada) {
    return <div className="min-h-screen bg-navy grid place-items-center text-white/60">Carregando...</div>;
  }

  if (!isMember) {
    return (
      <div className="min-h-screen bg-navy grid place-items-center px-8 text-center">
        <div>
          <div className="size-16 rounded-full bg-cyan/10 grid place-items-center mx-auto mb-4">
            <Lock className="size-7 text-cyan" />
          </div>
          <h2 className="font-display font-extrabold italic uppercase text-white text-xl">Grupo exclusivo</h2>
          <p className="text-white/50 text-sm mt-2 mb-6">Só jogadores confirmados nesta pelada podem ver e enviar mensagens.</p>
          <Link to="/pelada/$peladaId" params={{ peladaId }} className="inline-block px-6 py-3 bg-cyan text-navy rounded-2xl font-display font-extrabold italic uppercase text-sm">
            Ver pelada
          </Link>
        </div>
      </div>
    );
  }

  const endsAt = new Date(pelada.starts_at).getTime() + pelada.duration_minutes * 60000;
  const groupOpen = pelada.status !== "finished" && (pelada.group_mode === "permanent" || endsAt > Date.now());

  return (
    <div className="h-[100dvh] bg-navy flex flex-col">
      <header className="pt-12 px-4 pb-3 flex items-center gap-3 border-b border-white/10 bg-navy">
        <button onClick={() => navigate({ to: "/pelada/$peladaId", params: { peladaId } })} className="size-10 rounded-full bg-navy-soft grid place-items-center">
          <ArrowLeft className="size-5 text-white" />
        </button>
        <button onClick={() => setInfoOpen(true)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <div className="size-10 rounded-full bg-cyan/20 overflow-hidden grid place-items-center flex-none">
            {pelada.photo_url ? <img src={pelada.photo_url} alt="" className="w-full h-full object-cover" /> : <span className="text-cyan font-bold">⚽</span>}
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold truncate">{pelada.name}</p>
            <p className="text-xs text-white/50">{pelada.filled_slots} membros · toque para informações</p>
          </div>
        </button>
        <button onClick={() => setInfoOpen(true)} className="size-10 rounded-full bg-navy-soft grid place-items-center" aria-label="Informações do grupo">
          <Info className="size-5 text-cyan" />
        </button>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && <p className="text-center text-white/40 text-sm mt-10">Seja o primeiro a falar com a galera da pelada ⚽</p>}
        {messages.map((m) => {
          const mine = m.sender_id === user.id;
          const s = (senders as Record<string, { name: string; avatar_url: string | null }>)[m.sender_id];
          const canModerate = isOrganizer || mine;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`relative max-w-[78%] rounded-2xl px-3 py-2 ${mine ? "bg-cyan text-navy" : "bg-navy-soft text-white border border-white/5"}`}>
                {!mine && (
                  <p className="text-[11px] font-bold text-cyan mb-0.5">
                    {s?.name || "Jogador"} {m.sender_id === pelada.organizer_id && <Crown className="inline size-3" />}
                  </p>
                )}
                {m.deleted_at ? (
                  <p className="text-sm italic opacity-60">Mensagem removida</p>
                ) : m.kind === "image" && m.attachment_url ? (
                  <img src={m.attachment_url} alt="Foto" className="rounded-xl max-h-64" />
                ) : (
                  <p className="text-sm whitespace-pre-wrap break-words pr-5">{m.body}</p>
                )}
                {!m.deleted_at && (
                  <button onClick={() => setMenuFor(menuFor === m.id ? null : m.id)} className="absolute top-1 right-1 opacity-60" aria-label="Opções da mensagem">
                    <MoreVertical className="size-4" />
                  </button>
                )}
                {menuFor === m.id && (
                  <div className="absolute z-10 top-6 right-1 bg-navy border border-white/10 rounded-xl overflow-hidden text-white text-sm shadow-lg min-w-32">
                    {!mine && (
                      <button
                        className="block w-full text-left px-3 py-2 hover:bg-white/5"
                        onClick={() => {
                          setMenuFor(null);
                          setReport({ type: "message", messageId: m.id, source: "group", body: m.body, reportedUserId: m.sender_id, peladaId });
                        }}
                      >
                        Denunciar
                      </button>
                    )}
                    {canModerate && (
                      <button className="block w-full text-left px-3 py-2 text-destructive hover:bg-white/5" onClick={() => removeMessage(m.id)}>
                        Apagar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!groupOpen ? (
        <div className="p-4 border-t border-white/10 bg-navy pb-6 text-center text-sm text-white/50">
          Grupo encerrado — a pelada já terminou. Mensagens ficam guardadas por {pelada.template_id ? "7 dias" : "24h"}.
        </div>
      ) : (
      <div className="p-3 border-t border-white/10 flex items-center gap-2 bg-navy pb-6">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && sendPhoto(e.target.files[0])} />
        <button onClick={() => fileRef.current?.click()} disabled={sending} className="size-11 rounded-full bg-navy-soft grid place-items-center" aria-label="Enviar foto">
          <ImageIcon className="size-5 text-cyan" />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendText()}
          placeholder="Mensagem para o grupo"
          className="flex-1 h-11 px-4 rounded-full bg-navy-soft border border-white/10 text-white text-sm outline-none"
        />
        <button onClick={sendText} disabled={sending || !text.trim()} className="size-11 rounded-full bg-cyan grid place-items-center disabled:opacity-40" aria-label="Enviar">
          <Send className="size-5 text-navy" />
        </button>
      </div>
      )}

      <Sheet open={infoOpen} onOpenChange={setInfoOpen}>
        <SheetContent side="bottom" className="bg-navy border-white/10 rounded-t-3xl max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white font-display font-extrabold italic uppercase">{pelada.name}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-3">
            <p className="text-cyan font-mono text-xs font-bold uppercase">{formatMatchDate(pelada.starts_at)}</p>
            <div className="rounded-2xl overflow-hidden border border-white/10">
              <GoogleMap center={{ lat: pelada.latitude, lng: pelada.longitude }} zoom={15} markers={[{ lat: pelada.latitude, lng: pelada.longitude }]} interactive={false} className="w-full h-36" />
              <div className="p-3 bg-navy-soft flex items-center justify-between gap-2">
                <p className="text-sm text-white font-bold truncate">{pelada.location_name}</p>
                <a href={`https://www.google.com/maps/search/?api=1&query=${pelada.latitude},${pelada.longitude}`} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-xl bg-cyan/10 text-cyan text-xs font-bold uppercase flex items-center gap-1 flex-none">
                  <Navigation className="size-3" /> Abrir no mapa
                </a>
              </div>
            </div>
            <PeladaPlayersSection peladaId={pelada.id} userId={user.id} totalSlots={pelada.total_slots} />
            <button onClick={toggleMute} className="w-full py-3 rounded-2xl bg-navy-soft border border-white/10 text-white font-bold text-sm flex items-center justify-center gap-2">
              {muted ? <Bell className="size-4" /> : <BellOff className="size-4" />}
              {muted ? "Ativar notificações" : "Silenciar notificações"}
            </button>
            {!isOrganizer && (
              <button onClick={doLeave} className="w-full py-3 rounded-2xl bg-destructive/10 border border-destructive/40 text-destructive font-bold text-sm flex items-center justify-center gap-2">
                <LogOut className="size-4" /> Sair da pelada
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ReportSheet open={!!report} onOpenChange={(v) => !v && setReport(null)} target={report} reporterId={user.id} />
    </div>
  );
}
