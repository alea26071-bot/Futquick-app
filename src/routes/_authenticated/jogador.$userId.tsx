import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Star, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/jogador/$userId")({
  ssr: false,
  component: PlayerProfilePage,
});

function PlayerProfilePage() {
  const { userId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["player-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, username, avatar_url, bio, city, state, favorite_position, postura_score, rating_avg, peladas_played")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: isFollowing } = useQuery({
    queryKey: ["is-following", user.id, userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", user.id)
        .eq("following_id", userId)
        .maybeSingle();
      return !!data;
    },
  });

  const toggleFollow = async () => {
    if (isFollowing) {
      const { error } = await supabase
        .from("user_follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", userId);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase
        .from("user_follows")
        .insert({ follower_id: user.id, following_id: userId });
      if (error) return toast.error(error.message);
    }
    qc.invalidateQueries({ queryKey: ["is-following", user.id, userId] });
    qc.invalidateQueries({ queryKey: ["following", user.id] });
  };

  if (isLoading) {
    return <div className="min-h-screen bg-navy grid place-items-center text-white/60">Carregando...</div>;
  }
  if (!profile) {
    return <div className="min-h-screen bg-navy grid place-items-center text-white/60">Jogador não encontrado.</div>;
  }

  const handle = profile.username || (profile.name || "jogador").toLowerCase().replace(/[^a-z0-9]/g, "");

  return (
    <div className="min-h-screen bg-navy pb-32">
      <div className="pt-12 px-5 flex items-center gap-3">
        <button onClick={() => navigate({ to: "/descobrir" })} className="size-10 rounded-full bg-navy-soft grid place-items-center">
          <ArrowLeft className="size-5 text-white" />
        </button>
        <p className="text-mono-label text-white/40">Perfil</p>
      </div>

      <div className="px-6 py-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="size-20 rounded-full bg-cyan/20 grid place-items-center overflow-hidden flex-none">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-cyan font-bold text-2xl">{profile.name?.[0]?.toUpperCase() || "?"}</span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-display font-extrabold italic text-white uppercase truncate">
              {profile.name || "Anônimo"}
            </h1>
            <p className="text-sm text-white/50">@{handle}</p>
            {(profile.city || profile.state) && (
              <p className="text-xs text-white/40 flex items-center gap-1 mt-1">
                <MapPin className="size-3" /> {[profile.city, profile.state].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>

        {user.id !== userId && (
          <button
            onClick={toggleFollow}
            className={`w-full py-3.5 rounded-2xl font-display font-extrabold italic uppercase active:scale-[0.98] transition-transform flex items-center justify-center gap-2 ${
              isFollowing
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-400/30"
                : "bg-cyan text-navy"
            }`}
          >
            {isFollowing && <Star className="size-4 fill-emerald-400" />}
            {isFollowing ? "Seguindo" : "Seguir"}
          </button>
        )}

        {profile.bio && (
          <div className="p-4 bg-navy-soft/40 rounded-2xl border border-white/5">
            <p className="text-mono-label mb-2">Sobre</p>
            <p className="text-sm text-white/80">{profile.bio}</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 bg-navy-soft/60 rounded-2xl border border-white/5">
            <p className="text-mono-label text-white/40">Postura</p>
            <p className="text-xl font-mono font-bold text-cyan mt-1">{profile.postura_score}%</p>
          </div>
          <div className="p-4 bg-navy-soft/60 rounded-2xl border border-white/5">
            <p className="text-mono-label text-white/40">Nota</p>
            <p className="text-xl font-mono font-bold text-white mt-1">{Number(profile.rating_avg ?? 0).toFixed(1)}</p>
          </div>
          <div className="p-4 bg-navy-soft/60 rounded-2xl border border-white/5">
            <p className="text-mono-label text-white/40">Peladas</p>
            <p className="text-xl font-mono font-bold text-white mt-1">{profile.peladas_played}</p>
          </div>
        </div>

        {profile.favorite_position && (
          <div className="p-4 bg-navy-soft/40 rounded-2xl border border-white/5">
            <p className="text-mono-label mb-1">Posição favorita</p>
            <p className="text-white font-bold">{profile.favorite_position}</p>
          </div>
        )}
      </div>
    </div>
  );
}
