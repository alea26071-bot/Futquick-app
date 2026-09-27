import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GoogleMap } from "@/components/GoogleMap";
import { FIELD_TYPE_LABEL, LEVEL_LABEL, WEEKDAY_LABEL, brTimeString, brWeekday, formatMatchDate, formatPrice } from "@/lib/pelada-utils";
import { ArrowLeft, MapPin, Heart, Share2, Navigation, Check, X, MessageCircle, Trash2, Repeat, Pin } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { PostMatchRating } from "@/components/PostMatchRating";
import { pinPelada, setTemplateActive, createNextFromTemplate } from "@/lib/pelada-templates.functions";
import { PeladaPlayersSection } from "@/components/PeladaPlayersSheet";
import { PeladaRequestsPanel } from "@/components/PeladaRequestsPanel";

export const Route = createFileRoute("/_authenticated/pelada/$peladaId")({
  ssr: false,
  component: PeladaDetailPage,
});


function PeladaDetailPage() {
  const { peladaId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [requesting, setRequesting] = useState(false);

  const { data: pelada, isLoading } = useQuery({
    queryKey: ["pelada", peladaId],
    queryFn: async () => {
      const { data, error } = await supabase.from("peladas").select("*").eq("id", peladaId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: organizer } = useQuery({
    queryKey: ["profile", pelada?.organizer_id],
    queryFn: async () => {
      if (!pelada) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", pelada.organizer_id).maybeSingle();
      return data;
    },
    enabled: !!pelada,
  });

  const { data: myRequest } = useQuery({
    queryKey: ["pelada-request", peladaId, user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("pelada_requests")
        .select("*")
        .eq("pelada_id", peladaId)
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: myLike, refetch: refetchLike } = useQuery({
    queryKey: ["pelada-like", peladaId, user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("pelada_likes")
        .select("pelada_id")
        .eq("pelada_id", peladaId)
        .eq("user_id", user.id)
        .maybeSingle();
      return !!data;
    },
  });

  const isOrganizerEarly = pelada?.organizer_id === user.id;

  const { data: template } = useQuery({
    queryKey: ["pelada-template", pelada?.template_id],
    queryFn: async () => {
      if (!pelada?.template_id) return null;
      const { data } = await supabase
        .from("pelada_templates")
        .select("*")
        .eq("id", pelada.template_id)
        .maybeSingle();
      return data;
    },
    enabled: !!pelada?.template_id && isOrganizerEarly,
  });

  const [pinning, setPinning] = useState(false);

  if (isLoading || !pelada) {
    return <div className="min-h-screen bg-navy grid place-items-center text-white/60">Carregando...</div>;
  }

  const isOrganizer = pelada.organizer_id === user.id;
  const remaining = pelada.total_slots - pelada.filled_slots;
  const isFull = remaining <= 0;
  const peladaWeekday = brWeekday(new Date(pelada.starts_at));
  const peladaTime = brTimeString(new Date(pelada.starts_at));
  const isPinned = !!template?.active;

  const doPin = async () => {
    setPinning(true);
    try {
      await pinPelada({ data: { peladaId: pelada.id } });
      toast.success(`Pelada fixada toda ${WEEKDAY_LABEL[peladaWeekday]} às ${peladaTime}`);
      qc.invalidateQueries({ queryKey: ["pelada", peladaId] });
      qc.invalidateQueries({ queryKey: ["pelada-templates", user.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao fixar pelada");
    } finally {
      setPinning(false);
    }
  };

  const doUnpin = async () => {
    if (!template) return;
    setPinning(true);
    try {
      await setTemplateActive({ data: { templateId: template.id, active: false } });
      toast.success("Pelada não é mais fixa");
      qc.invalidateQueries({ queryKey: ["pelada-template", pelada.template_id] });
      qc.invalidateQueries({ queryKey: ["pelada-templates", user.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao desfixar");
    } finally {
      setPinning(false);
    }
  };

  const doRepeatNow = async () => {
    if (!template) return;
    setPinning(true);
    try {
      const res = await createNextFromTemplate({ data: { templateId: template.id } });
      toast.success(res.created ? "Próxima pelada criada!" : "A próxima pelada já existe.");
      qc.invalidateQueries({ queryKey: ["peladas"] });
      navigate({ to: "/pelada/$peladaId", params: { peladaId: res.peladaId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao repetir pelada");
    } finally {
      setPinning(false);
    }
  };



  const requestJoin = async () => {
    setRequesting(true);
    try {
      if (pelada.auto_approve) {
        const { error } = await supabase.from("pelada_requests").insert({
          pelada_id: pelada.id,
          user_id: user.id,
          status: "accepted",
          responded_at: new Date().toISOString(),
        });
        if (error) throw error;
        toast.success("Você está dentro! Boa pelada.");
      } else {
        const { error } = await supabase.from("pelada_requests").insert({
          pelada_id: pelada.id,
          user_id: user.id,
          status: "pending",
        });
        if (error) throw error;
        toast.success("Solicitação enviada. Aguarde a resposta do organizador.");
      }
      qc.invalidateQueries({ queryKey: ["pelada", peladaId] });
      qc.invalidateQueries({ queryKey: ["pelada-request", peladaId, user.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao entrar");
    } finally {
      setRequesting(false);
    }
  };

  const cancelRequest = async () => {
    if (!myRequest) return;
    setRequesting(true);
    const { error } = await supabase
      .from("pelada_requests")
      .update({ status: "cancelled" })
      .eq("id", myRequest.id);
    setRequesting(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Você saiu da pelada.");
      qc.invalidateQueries({ queryKey: ["pelada", peladaId] });
      qc.invalidateQueries({ queryKey: ["pelada-request", peladaId, user.id] });
    }
  };

  const toggleLike = async () => {
    if (myLike) {
      await supabase.from("pelada_likes").delete().eq("pelada_id", pelada.id).eq("user_id", user.id);
    } else {
      await supabase.from("pelada_likes").insert({ pelada_id: pelada.id, user_id: user.id });
    }
    refetchLike();
  };

  const share = async () => {
    const url = window.location.href;
    const text = `${pelada.name} — ${formatMatchDate(pelada.starts_at)} em ${pelada.location_name}. Vem jogar!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Futquick", text, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast.success("Link copiado!");
    }
  };

  const deletePelada = async () => {
    if (!isOrganizer) return;
    if (!window.confirm("Apagar esta pelada? Esta ação não pode ser desfeita.")) return;
    const { error } = await supabase.from("peladas").delete().eq("id", pelada.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pelada apagada");
    qc.invalidateQueries({ queryKey: ["peladas"] });
    navigate({ to: "/descobrir" });
  };

  const openChatWithOrganizer = async () => {
    if (isOrganizer) return;
    // Find or create thread
    const { data: existing } = await supabase
      .from("chat_threads")
      .select("id")
      .eq("pelada_id", pelada.id)
      .eq("organizer_id", pelada.organizer_id)
      .eq("player_id", user.id)
      .maybeSingle();
    let threadId = existing?.id;
    if (!threadId) {
      const { data, error } = await supabase
        .from("chat_threads")
        .insert({
          pelada_id: pelada.id,
          organizer_id: pelada.organizer_id,
          player_id: user.id,
        })
        .select("id")
        .single();
      if (error) {
        toast.error(error.message);
        return;
      }
      threadId = data.id;
    }
    navigate({ to: "/chat/$threadId", params: { threadId } });
  };

  return (
    <div className="min-h-screen bg-navy pb-32">
      <div className="relative h-72">
        {pelada.photo_url ? (
          <img src={pelada.photo_url} alt={pelada.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-cyan/40 via-navy-soft to-navy grid place-items-center">
            <span className="font-display font-extrabold italic text-white/10 text-7xl tracking-tighter">
              {FIELD_TYPE_LABEL[pelada.field_type]?.toUpperCase()}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/40 to-navy/60" />

        <div className="absolute top-0 left-0 right-0 pt-12 px-4 flex justify-between">
          <button onClick={() => navigate({ to: "/descobrir" })} className="size-10 rounded-full bg-navy/60 backdrop-blur-md grid place-items-center">
            <ArrowLeft className="size-5 text-white" />
          </button>
          <div className="flex gap-2">
            <button onClick={toggleLike} className="size-10 rounded-full bg-navy/60 backdrop-blur-md grid place-items-center">
              <Heart className={`size-5 ${myLike ? "fill-cyan text-cyan" : "text-white"}`} />
            </button>
            <button onClick={share} className="size-10 rounded-full bg-navy/60 backdrop-blur-md grid place-items-center">
              <Share2 className="size-5 text-white" />
            </button>
          </div>
        </div>

        <div className="absolute bottom-6 left-5 right-5">
          <p className="text-cyan font-mono text-xs font-bold uppercase tracking-widest mb-1">
            {formatMatchDate(pelada.starts_at)}
          </p>
          <h2 className="text-3xl font-display font-extrabold italic text-white uppercase leading-tight text-balance">
            {pelada.name}
          </h2>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Organizer */}
        {organizer && (
          <Link
            to="/jogador/$userId"
            params={{ userId: pelada.organizer_id }}
            className="flex items-center justify-between p-4 rounded-2xl bg-navy-soft border border-white/5 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-full bg-cyan/20 grid place-items-center overflow-hidden">
                {organizer.avatar_url ? (
                  <img src={organizer.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-cyan font-bold">{organizer.name?.[0]?.toUpperCase() || "?"}</span>
                )}
              </div>
              <div>
                <p className="text-xs text-white/60 uppercase font-bold">Organizado por</p>
                <p className="text-white font-bold">{organizer.name || "Anônimo"}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-mono-label text-white/40">Postura</p>
              <p className="text-cyan font-mono font-bold text-lg">{organizer.postura_score}%</p>
            </div>
          </Link>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-navy-soft/60 rounded-2xl border border-white/5">
            <p className="text-mono-label text-white/40">Vagas restantes</p>
            <p className="text-2xl font-display font-extrabold italic text-white mt-1">
              {isFull ? "LOTADA" : `${remaining} / ${pelada.total_slots}`}
            </p>
          </div>
          <div className="p-4 bg-navy-soft/60 rounded-2xl border border-white/5">
            <p className="text-mono-label text-white/40">Valor</p>
            <p className="text-2xl font-display font-extrabold italic text-white mt-1">
              {formatPrice(pelada.price_cents)}
            </p>
          </div>
          <div className="p-4 bg-navy-soft/60 rounded-2xl border border-white/5">
            <p className="text-mono-label text-white/40">Campo</p>
            <p className="text-lg font-display font-extrabold text-white mt-1">
              {FIELD_TYPE_LABEL[pelada.field_type]}
            </p>
          </div>
          <div className="p-4 bg-navy-soft/60 rounded-2xl border border-white/5">
            <p className="text-mono-label text-white/40">Nível</p>
            <p className="text-lg font-display font-extrabold text-white mt-1">
              {LEVEL_LABEL[pelada.level]}
            </p>
          </div>
        </div>

        <PeladaPlayersSection peladaId={pelada.id} userId={user.id} totalSlots={pelada.total_slots} />



        {pelada.description && (
          <div className="p-4 bg-navy-soft/40 rounded-2xl border border-white/5">
            <p className="text-mono-label mb-2">Descrição</p>
            <p className="text-sm text-white/80">{pelada.description}</p>
          </div>
        )}

        <PostMatchRating
          peladaId={pelada.id}
          organizerId={pelada.organizer_id}
          userId={user.id}
          isOrganizer={isOrganizer}
          hasFinished={
            pelada.status === "finished" ||
            new Date(pelada.starts_at).getTime() + (pelada.duration_minutes ?? 90) * 60_000 < Date.now()
          }
          wasAccepted={myRequest?.status === "accepted"}
        />

        {isOrganizer && (
          <div className="p-4 rounded-2xl bg-navy-soft border border-cyan/20 space-y-3">
            <div className="flex items-center gap-2">
              <Pin className="size-4 text-cyan" />
              <p className="text-mono-label text-cyan">Pelada fixa</p>
            </div>
            {isPinned ? (
              <>
                <p className="text-sm text-white/80">
                  Fixa toda <span className="font-bold text-white">{WEEKDAY_LABEL[template!.weekday]}</span> ·{" "}
                  {template!.time_of_day.slice(0, 5)} — criamos a próxima automaticamente.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={doRepeatNow}
                    disabled={pinning}
                    className="flex-1 py-3 rounded-xl bg-cyan text-navy font-bold uppercase text-xs flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
                  >
                    <Repeat className="size-4" /> Repetir agora
                  </button>
                  <button
                    onClick={doUnpin}
                    disabled={pinning}
                    className="px-4 py-3 rounded-xl bg-navy border border-white/10 text-white/70 font-bold uppercase text-xs disabled:opacity-50"
                  >
                    Desfixar
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-white/70">
                  Repita esta pelada toda semana sem preencher tudo de novo.
                </p>
                <button
                  onClick={doPin}
                  disabled={pinning}
                  className="w-full py-3 rounded-xl bg-cyan/10 border border-cyan/40 text-cyan font-bold uppercase text-xs flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
                >
                  <Pin className="size-4" /> Fixar toda {WEEKDAY_LABEL[peladaWeekday]} · {peladaTime}
                </button>
              </>
            )}
          </div>
        )}



        {!isOrganizer && myRequest && (myRequest.status === "pending" || myRequest.status === "accepted") && (
          <button
            onClick={openChatWithOrganizer}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-navy-soft border border-cyan/30 text-cyan font-display font-extrabold italic uppercase active:scale-[0.98] transition-transform"
          >
            <MessageCircle className="size-5" />
            Falar com organizador
          </button>
        )}
        {!isOrganizer && !myRequest && (
          <p className="text-center text-xs text-white/40">
            Solicite uma vaga para conversar com o organizador.
          </p>
        )}




        <div>
          <p className="text-mono-label mb-3">Localização</p>
          <div className="rounded-2xl overflow-hidden border border-white/10">
            <GoogleMap
              center={{ lat: pelada.latitude, lng: pelada.longitude }}
              zoom={15}
              markers={[{ lat: pelada.latitude, lng: pelada.longitude }]}
              interactive={false}
              className="w-full h-40"
            />
            <div className="p-4 bg-navy-soft flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <MapPin className="size-4 text-cyan flex-none mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{pelada.location_name}</p>
                  <p className="text-xs text-white/60 truncate">{pelada.address}</p>
                </div>
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${pelada.latitude},${pelada.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl bg-cyan/10 text-cyan text-xs font-bold uppercase flex items-center gap-1 flex-none"
              >
                <Navigation className="size-3" />
                Rota
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-navy border-t border-white/10 z-40">
        <div className="max-w-[430px] mx-auto">
          {isOrganizer ? (
            <div className="flex gap-2">
              <div className="flex-1 py-4 bg-navy-soft border border-white/10 text-white/60 rounded-2xl font-display font-extrabold italic uppercase text-center">
                Você organiza
              </div>
              <button
                onClick={deletePelada}
                className="px-4 rounded-2xl bg-destructive/10 border border-destructive/40 text-destructive grid place-items-center active:scale-95 transition-transform"
                aria-label="Apagar pelada"
              >
                <Trash2 className="size-5" />
              </button>
            </div>
          ) : myRequest?.status === "accepted" ? (
            <button
              onClick={cancelRequest}
              disabled={requesting}
              className="w-full py-4 bg-navy-soft border border-cyan/30 text-cyan rounded-2xl font-display font-extrabold italic uppercase flex items-center justify-center gap-2"
            >
              <Check className="size-5" /> Você está dentro — Sair
            </button>
          ) : myRequest?.status === "pending" ? (
            <button
              onClick={cancelRequest}
              disabled={requesting}
              className="w-full py-4 bg-navy-soft border border-warning/40 text-warning rounded-2xl font-display font-extrabold italic uppercase flex items-center justify-center gap-2"
            >
              Solicitação pendente — Cancelar
            </button>
          ) : myRequest?.status === "rejected" ? (
            <div className="w-full py-4 bg-navy-soft border border-destructive/40 text-destructive rounded-2xl font-display font-extrabold italic uppercase text-center flex items-center justify-center gap-2">
              <X className="size-5" /> Solicitação recusada
            </div>
          ) : isFull ? (
            <div className="w-full py-4 bg-navy-soft border border-white/10 text-white/40 rounded-2xl font-display font-extrabold italic uppercase text-center">
              Pelada lotada
            </div>
          ) : (
            <button
              onClick={requestJoin}
              disabled={requesting}
              className="w-full py-5 bg-cyan text-navy rounded-2xl font-display font-extrabold italic uppercase text-lg active:scale-95 transition-transform"
            >
              {requesting ? "..." : "Quero Participar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
