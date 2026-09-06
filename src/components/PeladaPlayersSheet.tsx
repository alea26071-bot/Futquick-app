import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Users, Star, ChevronRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";

type PlayerRow = {
  id: string;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
};

function usePlayers(peladaId: string, userId: string) {
  const qc = useQueryClient();

  const players = useQuery({
    queryKey: ["pelada-players", peladaId],
    queryFn: async (): Promise<PlayerRow[]> => {
      const { data: reqs, error } = await supabase
        .from("pelada_requests")
        .select("user_id, created_at")
        .eq("pelada_id", peladaId)
        .eq("status", "accepted")
        .order("created_at", { ascending: true });
      if (error) throw error;
      const ids = (reqs ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, username, avatar_url")
        .in("id", ids);
      const byId = new Map((profiles ?? []).map((p) => [p.id, p as PlayerRow]));
      return ids
        .map((id) => byId.get(id))
        .filter((p): p is PlayerRow => !!p);
    },
  });

  const following = useQuery({
    queryKey: ["following", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", userId);
      return new Set((data ?? []).map((r) => r.following_id));
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`pelada-players-${peladaId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pelada_requests", filter: `pelada_id=eq.${peladaId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["pelada-players", peladaId] });
          qc.invalidateQueries({ queryKey: ["pelada", peladaId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [peladaId, qc]);

  return { players, following };
}

function handleAt(p: PlayerRow) {
  return p.username || (p.name || "jogador").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function PlayerItem({
  player,
  isFollowing,
  isMe,
  onToggleFollow,
  onOpen,
}: {
  player: PlayerRow;
  isFollowing: boolean;
  isMe: boolean;
  onToggleFollow: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-navy-soft/60 border border-white/5">
      <button onClick={onOpen} className="flex items-center gap-3 min-w-0 flex-1 text-left">
        <div className="size-11 rounded-full bg-cyan/20 grid place-items-center overflow-hidden flex-none">
          {player.avatar_url ? (
            <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-cyan font-bold">{player.name?.[0]?.toUpperCase() || "?"}</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {isFollowing && <Star className="size-3.5 text-emerald-400 fill-emerald-400 flex-none" />}
            <p className="text-white font-bold truncate">{player.name || "Anônimo"}</p>
          </div>
          <p className="text-xs text-white/50 truncate">@{handleAt(player)}</p>
        </div>
      </button>
      {!isMe && (
        <button
          onClick={onToggleFollow}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide flex-none ${
            isFollowing
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-400/30"
              : "bg-cyan/10 text-cyan border border-cyan/30"
          }`}
        >
          {isFollowing ? "Seguindo" : "Seguir"}
        </button>
      )}
    </div>
  );
}

export function PeladaPlayersSection({
  peladaId,
  userId,
  totalSlots,
}: {
  peladaId: string;
  userId: string;
  totalSlots: number;
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { players, following } = usePlayers(peladaId, userId);

  const list = players.data ?? [];
  const followingSet = following.data ?? new Set<string>();

  const { followed, others } = useMemo(() => {
    const followed: PlayerRow[] = [];
    const others: PlayerRow[] = [];
    for (const p of list) (followingSet.has(p.id) ? followed : others).push(p);
    return { followed, others };
  }, [list, followingSet]);

  const toggleFollow = async (targetId: string) => {
    const isFollowing = followingSet.has(targetId);
    if (isFollowing) {
      const { error } = await supabase
        .from("user_follows")
        .delete()
        .eq("follower_id", userId)
        .eq("following_id", targetId);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase
        .from("user_follows")
        .insert({ follower_id: userId, following_id: targetId });
      if (error) return toast.error(error.message);
    }
    qc.invalidateQueries({ queryKey: ["following", userId] });
  };

  const navigate = useNavigate();
  const openProfile = (id: string) => {
    setOpen(false);
    if (id === userId) navigate({ to: "/perfil" });
    else navigate({ to: "/jogador/$userId", params: { userId: id } });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between p-4 rounded-2xl bg-navy-soft border border-white/5 active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-10 rounded-full bg-cyan/15 grid place-items-center flex-none">
            <Users className="size-5 text-cyan" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-mono-label text-white/40">Ver jogadores</p>
            <p className="text-white font-bold">
              <span className="font-mono">{list.length}</span> de{" "}
              <span className="font-mono">{totalSlots}</span> jogadores
            </p>
          </div>
        </div>
        <ChevronRight className="size-5 text-white/40 flex-none" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="bg-navy border-white/10 rounded-t-3xl max-h-[85vh] overflow-y-auto [&>button]:hidden"
        >
          <SheetHeader className="flex-row items-center justify-between space-y-0 mb-4">
            <SheetTitle className="text-white font-display font-extrabold italic uppercase text-xl">
              Jogadores da pelada
            </SheetTitle>
            <button onClick={() => setOpen(false)} className="size-9 rounded-full bg-navy-soft grid place-items-center">
              <X className="size-4 text-white/70" />
            </button>
          </SheetHeader>

          {players.isLoading ? (
            <p className="text-white/50 text-sm py-6 text-center">Carregando...</p>
          ) : list.length === 0 ? (
            <p className="text-white/50 text-sm py-6 text-center">Ninguém confirmado ainda.</p>
          ) : (
            <div className="space-y-5 pb-6">
              {followed.length > 0 && (
                <div className="space-y-2">
                  <p className="text-mono-label text-emerald-400 flex items-center gap-1.5">
                    <Star className="size-3.5 fill-emerald-400" /> Pessoas que você segue
                  </p>
                  {followed.map((p) => (
                    <PlayerItem
                      key={p.id}
                      player={p}
                      isFollowing
                      isMe={p.id === userId}
                      onToggleFollow={() => toggleFollow(p.id)}
                      onOpen={() => openProfile(p.id)}
                    />
                  ))}
                </div>
              )}
              {others.length > 0 && (
                <div className="space-y-2">
                  <p className="text-mono-label text-white/40">
                    {followed.length > 0 ? "Outros jogadores" : "Jogadores confirmados"}
                  </p>
                  {others.map((p) => (
                    <PlayerItem
                      key={p.id}
                      player={p}
                      isFollowing={false}
                      isMe={p.id === userId}
                      onToggleFollow={() => toggleFollow(p.id)}
                      onOpen={() => openProfile(p.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
