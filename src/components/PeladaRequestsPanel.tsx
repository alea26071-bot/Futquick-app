import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { respondToJoinRequest, openChatThread } from "@/lib/notifications.functions";
import { Check, X, MessageCircle, Star, Users } from "lucide-react";
import { toast } from "sonner";

type Props = {
  peladaId: string;
  organizerId: string;
  hasFinished: boolean;
};

type RequestRow = {
  id: string;
  user_id: string;
  status: string;
  message: string | null;
  created_at: string;
};

export function PeladaRequestsPanel({ peladaId, organizerId, hasFinished }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [rating, setRating] = useState<Record<string, number>>({});

  const { data: requests = [] } = useQuery({
    queryKey: ["pelada-requests", peladaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pelada_requests")
        .select("id, user_id, status, message, created_at")
        .eq("pelada_id", peladaId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as RequestRow[];
    },
  });

  const ids = requests.map((r) => r.user_id);

  const { data: profiles = {} } = useQuery({
    queryKey: ["profiles-map", ids.slice().sort().join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, name, avatar_url, rating_avg").in("id", ids);
      const map: Record<string, { name: string | null; avatar_url: string | null; rating_avg: number | null }> = {};
      for (const p of data ?? []) map[p.id] = { name: p.name, avatar_url: p.avatar_url, rating_avg: p.rating_avg };
      return map;
    },
  });

  const { data: myRatings = {} } = useQuery({
    queryKey: ["pelada-player-ratings", peladaId, organizerId],
    enabled: hasFinished,
    queryFn: async () => {
      const { data } = await supabase
        .from("pelada_ratings")
        .select("rated_id, score")
        .eq("pelada_id", peladaId)
        .eq("rater_id", organizerId);
      const map: Record<string, number> = {};
      for (const r of data ?? []) map[r.rated_id] = r.score;
      return map;
    },
  });

  const respond = async (requestId: string, status: "accepted" | "rejected") => {
    setBusy(requestId);
    try {
      await respondToJoinRequest({ data: { requestId, status } });
      toast.success(status === "accepted" ? "Jogador confirmado!" : "Solicitação recusada.");
      qc.invalidateQueries({ queryKey: ["pelada-requests", peladaId] });
      qc.invalidateQueries({ queryKey: ["pelada", peladaId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao responder");
    } finally {
      setBusy(null);
    }
  };

  const chatWith = async (playerId: string) => {
    setBusy(playerId);
    try {
      const { threadId } = await openChatThread({ data: { peladaId, otherUserId: playerId } });
      navigate({ to: "/chat/$threadId", params: { threadId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao abrir conversa");
    } finally {
      setBusy(null);
    }
  };

  const ratePlayer = async (playerId: string, score: number) => {
    setBusy(playerId);
    const { error } = await supabase.from("pelada_ratings").upsert(
      { pelada_id: peladaId, rater_id: organizerId, rated_id: playerId, score },
      { onConflict: "pelada_id,rater_id,rated_id" },
    );
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Avaliação registrada. Valeu!");
    qc.invalidateQueries({ queryKey: ["pelada-player-ratings", peladaId, organizerId] });
  };

  const pending = requests.filter((r) => r.status === "pending");
  const accepted = requests.filter((r) => r.status === "accepted");

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-navy-soft border border-white/10 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-cyan" />
          <p className="text-mono-label text-cyan">
            Solicitações {pending.length > 0 && `· ${pending.length} pendente${pending.length > 1 ? "s" : ""}`}
          </p>
        </div>

        {pending.length === 0 && accepted.length === 0 && (
          <p className="text-sm text-white/50">Nenhum jogador solicitou vaga ainda.</p>
        )}

        {pending.map((r) => {
          const p = profiles[r.user_id];
          return (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-navy border border-cyan/20">
              <div className="size-10 rounded-full bg-cyan/20 grid place-items-center overflow-hidden flex-none">
                {p?.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-cyan font-bold">{(p?.name ?? "?")[0]?.toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm truncate">{p?.name ?? "Jogador"}</p>
                {r.message && <p className="text-xs text-white/50 truncate">{r.message}</p>}
              </div>
              <button
                onClick={() => respond(r.id, "accepted")}
                disabled={busy === r.id}
                aria-label="Aceitar"
                className="size-10 rounded-xl bg-cyan text-navy grid place-items-center disabled:opacity-40"
              >
                <Check className="size-5" strokeWidth={3} />
              </button>
              <button
                onClick={() => respond(r.id, "rejected")}
                disabled={busy === r.id}
                aria-label="Recusar"
                className="size-10 rounded-xl bg-navy-soft border border-white/10 grid place-items-center disabled:opacity-40"
              >
                <X className="size-5 text-white/60" />
              </button>
            </div>
          );
        })}

        {accepted.map((r) => {
          const p = profiles[r.user_id];
          const given = myRatings[r.user_id];
          const draft = rating[r.user_id] ?? 0;
          return (
            <div key={r.id} className="p-3 rounded-xl bg-navy border border-white/10 space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-cyan/20 grid place-items-center overflow-hidden flex-none">
                  {p?.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-cyan font-bold">{(p?.name ?? "?")[0]?.toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{p?.name ?? "Jogador"}</p>
                  <p className="text-xs text-cyan/70">Confirmado</p>
                </div>
                <button
                  onClick={() => chatWith(r.user_id)}
                  disabled={busy === r.user_id}
                  aria-label="Conversar"
                  className="size-10 rounded-xl bg-navy-soft border border-cyan/30 grid place-items-center disabled:opacity-40"
                >
                  <MessageCircle className="size-5 text-cyan" />
                </button>
              </div>

              {hasFinished && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
                  <p className="text-xs text-white/60">{given ? "Sua nota" : "Avalie o jogador"}</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        disabled={!!given || busy === r.user_id}
                        onClick={() => {
                          setRating((prev) => ({ ...prev, [r.user_id]: n }));
                          void ratePlayer(r.user_id, n);
                        }}
                        aria-label={`${n} estrelas`}
                      >
                        <Star
                          className={`size-5 ${
                            n <= (given ?? draft) ? "fill-cyan text-cyan" : "text-white/20"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
