import { ProfileOptionsSheet } from "@/components/ProfileOptionsSheet";
import { useGameTerm } from "@/components/GameTermProvider";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  CircleUserRound,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Plus,
  ShieldCheck,
  Star,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { invitePlayerToPelada } from "@/lib/notifications.functions";

export const Route = createFileRoute("/_authenticated/jogador/$userId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Perfil do jogador | Futquick" },
      { name: "description", content: "Veja o perfil, as avaliações e a postura de um jogador no Futquick." },
      { property: "og:title", content: "Perfil do jogador | Futquick" },
      { property: "og:description", content: "Veja o perfil, as avaliações e a postura de um jogador no Futquick." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlayerProfilePage,
});

function PlayerProfilePage() {
  const { createLabel } = useGameTerm();
  const { userId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [busyInvite, setBusyInvite] = useState<string | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["player-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, username, avatar_url, bio, city, state, favorite_position, postura_score, rating_avg, peladas_played, phone_verified, created_at")
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

  const { data: sharedThread } = useQuery({
    queryKey: ["shared-thread", user.id, userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_threads")
        .select("id, last_message_at")
        .or(
          `and(organizer_id.eq.${user.id},player_id.eq.${userId}),and(organizer_id.eq.${userId},player_id.eq.${user.id})`,
        )
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: user.id !== userId,
  });

  const { data: ownedPeladas = [] } = useQuery({
    queryKey: ["profile-invite-peladas", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("peladas")
        .select("id, name, starts_at, location_name, filled_slots, total_slots")
        .eq("organizer_id", user.id)
        .eq("status", "open")
        .gt("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: user.id !== userId,
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

  const openMessage = () => {
    if (!sharedThread) {
      toast.info("O chat é liberado quando vocês participam da mesma pelada.");
      return;
    }
    navigate({ to: "/chat/$threadId", params: { threadId: sharedThread.id } });
  };

  const sendInvite = async (peladaId: string) => {
    setBusyInvite(peladaId);
    try {
      await invitePlayerToPelada({ data: { peladaId, playerId: userId } });
      toast.success("Convite enviado!");
      setInviteOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o convite");
    } finally {
      setBusyInvite(null);
    }
  };

  const [optionsOpen, setOptionsOpen] = useState(false);
  const shareProfile = async () => {
    const url = window.location.href;
    const title = `${profile?.name || "Jogador"} no Futquick`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        return;
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link do perfil copiado!");
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-navy grid place-items-center text-white/60">Carregando...</div>;
  }
  if (!profile) {
    return <div className="min-h-screen bg-navy grid place-items-center text-white/60">Jogador não encontrado.</div>;
  }

  const handle = profile.username || (profile.name || "jogador").toLowerCase().replace(/[^a-z0-9]/g, "");

  const isMe = user.id === userId;
  const memberSince = new Date(profile.created_at).getFullYear();

  return (
    <main className="min-h-screen bg-background pb-12 text-foreground">
      <section className="relative h-[44vh] min-h-80 max-h-[460px] overflow-hidden rounded-b-[2rem] bg-secondary">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={`Foto de ${profile.name}`} className="h-full w-full object-cover object-center" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-secondary">
            <CircleUserRound className="size-28 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-background/15 via-transparent to-background" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <Button aria-label="Voltar" variant="ghost" size="icon" onClick={() => window.history.back()} className="size-11 rounded-full bg-navy/60 text-white ring-1 ring-white/25 shadow-lg backdrop-blur-md hover:bg-navy/80 hover:text-white">
            <ArrowLeft className="size-6" strokeWidth={2.5} />
          </Button>
          <Button aria-label="Mais opções" onClick={() => setOptionsOpen(true)} variant="ghost" size="icon" className="size-11 rounded-full bg-navy/60 text-white ring-1 ring-white/25 shadow-lg backdrop-blur-md hover:bg-navy/80 hover:text-white">
            <MoreHorizontal className="size-6" strokeWidth={2.5} />
          </Button>
        </div>
      </section>
      <ProfileOptionsSheet
        open={optionsOpen}
        onOpenChange={setOptionsOpen}
        isMe={isMe}
        meId={user.id}
        otherId={userId}
        onShare={shareProfile}
      />

      <section className="relative z-10 mx-auto -mt-20 max-w-lg px-5 text-center">
        <div className="mx-auto size-28 overflow-hidden rounded-full border-4 border-background bg-secondary shadow-xl">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={`Perfil de ${profile.name}`} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center"><CircleUserRound className="size-12 text-muted-foreground" /></div>
          )}
        </div>

        <h1 className="mt-4 text-3xl font-extrabold">{profile.name || "Anônimo"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">@{handle}</p>
        {profile.phone_verified && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-primary">
            <BadgeCheck className="size-5 fill-primary text-primary-foreground" /> Jogador verificado
          </p>
        )}
        {(profile.city || profile.state) && (
          <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5" /> {[profile.city, profile.state].filter(Boolean).join(", ")}
          </p>
        )}

        {!isMe && (
          <div className="mt-7 grid grid-cols-[1fr_64px_1fr] items-start gap-3">
            <Button onClick={toggleFollow} variant={isFollowing ? "secondary" : "default"} className="h-12 rounded-full px-4 font-bold">
              {isFollowing ? <Star className="fill-primary text-primary" /> : <UserPlus />}
              {isFollowing ? "Seguindo" : "Seguir"}
            </Button>
            <div>
              <Button aria-label="Convidar para pelada" size="icon" onClick={() => setInviteOpen(true)} className="size-14 rounded-full shadow-lg">
                <Plus className="size-7" />
              </Button>
              <span className="mt-1.5 block text-[10px] font-semibold leading-tight text-primary">Convidar<br />para pelada</span>
            </div>
            <Button onClick={openMessage} variant="outline" className="h-12 rounded-full border-primary px-4 font-bold text-primary">
              <MessageCircle /> Mensagem
            </Button>
          </div>
        )}

        <div className="mt-7 grid grid-cols-3 gap-3">
          <Stat icon={<CircleUserRound />} value={profile.peladas_played} label="Peladas" tone="primary" />
          <Stat icon={<Star />} value={Number(profile.rating_avg ?? 0).toFixed(1)} label="Avaliação" tone="warning" />
          <Stat icon={<ShieldCheck />} value={`${profile.postura_score}%`} label="Postura" tone="success" />
        </div>

        <article className="mt-6 rounded-2xl border border-border bg-card p-5 text-left shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-bold"><CircleUserRound className="size-5 text-primary" /> Sobre {profile.name?.split(" ")[0] || "o jogador"}</h2>
          <p className="mt-3 text-sm leading-6 text-card-foreground">
            {profile.bio || (profile.favorite_position ? `${profile.favorite_position} em campo.` : "Este jogador ainda não adicionou uma apresentação.")}
          </p>
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="size-4" /> Membro desde {memberSince}</p>
        </article>
      </section>

      <Sheet open={inviteOpen} onOpenChange={setInviteOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl border-border bg-background pb-8">
          <SheetHeader><SheetTitle>Convidar para uma pelada</SheetTitle></SheetHeader>
          <div className="mt-5 space-y-2">
            {ownedPeladas.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">Você não tem uma pelada aberta no momento.</p>
                <Button className="mt-4 rounded-full" onClick={() => navigate({ to: "/criar" })}>{createLabel}</Button>
              </div>
            ) : ownedPeladas.map((pelada) => (
              <Button key={pelada.id} variant="ghost" disabled={busyInvite === pelada.id} onClick={() => sendInvite(pelada.id)} className="h-auto w-full justify-between rounded-xl border border-border p-4 text-left">
                <span className="min-w-0"><strong className="block truncate">{pelada.name}</strong><small className="mt-1 block truncate text-muted-foreground">{new Date(pelada.starts_at).toLocaleDateString("pt-BR")} · {pelada.location_name} · {pelada.filled_slots}/{pelada.total_slots}</small></span>
                <ChevronRight className="text-muted-foreground" />
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}

function Stat({ icon, value, label, tone }: { icon: ReactNode; value: string | number; label: string; tone: "primary" | "warning" | "success" }) {
  const toneClass = tone === "primary" ? "text-primary" : tone === "warning" ? "text-warning" : "text-success";
  return (
    <div className="rounded-2xl border border-border bg-card px-2 py-4 shadow-sm">
      <div className={`mx-auto flex size-5 items-center justify-center [&>svg]:size-5 ${toneClass}`}>{icon}</div>
      <p className="mt-2 font-mono text-xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
    </div>
  );
}
