import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";
import { toast } from "sonner";

type Props = {
  peladaId: string;
  organizerId: string;
  userId: string;
  isOrganizer: boolean;
  hasFinished: boolean;
  wasAccepted: boolean;
};

export function PostMatchRating({ peladaId, organizerId, userId, isOrganizer, hasFinished, wasAccepted }: Props) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const canRate = hasFinished && !isOrganizer && wasAccepted;

  const { data: existing } = useQuery({
    queryKey: ["pelada-rating", peladaId, userId],
    enabled: canRate,
    queryFn: async () => {
      const { data } = await supabase
        .from("pelada_ratings")
        .select("*")
        .eq("pelada_id", peladaId)
        .eq("rater_id", userId)
        .eq("rated_id", organizerId)
        .maybeSingle();
      return data;
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pelada_ratings").upsert(
        {
          pelada_id: peladaId,
          rater_id: userId,
          rated_id: organizerId,
          stars: rating,
          comment: comment.trim() || null,
        },
        { onConflict: "pelada_id,rater_id,rated_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avaliação enviada. Valeu!");
      qc.invalidateQueries({ queryKey: ["pelada-rating", peladaId, userId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao avaliar"),
  });

  if (!canRate) return null;

  if (existing) {
    return (
      <div className="p-4 rounded-2xl bg-navy-soft/60 border border-cyan/20">
        <p className="text-mono-label mb-2">Sua avaliação</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={`size-5 ${n <= existing.stars ? "fill-cyan text-cyan" : "text-white/20"}`}
            />
          ))}
        </div>
        {existing.comment && <p className="text-sm text-white/70 mt-2">{existing.comment}</p>}
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-navy-soft border border-cyan/30 space-y-3">
      <div>
        <p className="text-mono-label">Como foi a pelada?</p>
        <p className="text-sm text-white/60 mt-1">Avalie o organizador — leva 5 segundos.</p>
      </div>
      <div className="flex gap-2 justify-center py-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setRating(n)}
            className="p-1"
            aria-label={`${n} estrelas`}
          >
            <Star className={`size-8 ${n <= rating ? "fill-cyan text-cyan" : "text-white/20"}`} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Comentário (opcional)"
        rows={2}
        className="w-full p-3 rounded-xl bg-navy border border-white/10 text-white text-sm placeholder:text-white/30 focus:border-cyan outline-none resize-none"
      />
      <button
        onClick={() => submit.mutate()}
        disabled={rating === 0 || submit.isPending}
        className="w-full py-3 rounded-xl bg-cyan text-navy font-display font-extrabold italic uppercase disabled:opacity-30"
      >
        {submit.isPending ? "Enviando..." : "Enviar avaliação"}
      </button>
    </div>
  );
}
