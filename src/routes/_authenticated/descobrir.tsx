import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { PeladaCard, type PeladaCardData } from "@/components/PeladaCard";
import { haversineKm } from "@/lib/pelada-utils";
import { Zap } from "lucide-react";
import { NotificationsBell } from "@/components/NotificationsBell";
import { Logo } from "@/components/Logo";
import { useGameTerm } from "@/components/GameTermProvider";
import { Button } from "@/components/ui/button";
import { PendingRatings } from "@/components/PendingRatings";
import { modalitiesForFilters } from "@/lib/game-modalities";

export const Route = createFileRoute("/_authenticated/descobrir")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Descobrir jogos | Futquick" },
    { name: "description", content: "Encontre jogos e vagas perto de você no Futquick." },
    { property: "og:title", content: "Descobrir jogos | Futquick" },
    { property: "og:description", content: "Encontre jogos e vagas perto de você no Futquick." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: DescobrirPage,
});

const FILTERS = [
  { id: "hoje", label: "Hoje" },
  { id: "5km", label: "Até 5km" },
  { id: "gratis", label: "Grátis" },
  { id: "society", label: "Society" },
  { id: "campo", label: "Campo" },
  { id: "futsal", label: "Futsal" },
  { id: "outros", label: "Outros" },
] as const;

function DescobrirPage() {
  const { createLabel, plural } = useGameTerm();
  const { user } = Route.useRouteContext();
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(["hoje"]));
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 },
    );
  }, []);

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  const { data: peladas = [], isLoading } = useQuery({
    queryKey: ["peladas", "feed", Array.from(activeFilters).sort()],
    queryFn: async () => {
      let q = supabase
        .from("peladas")
        .select("*")
        .eq("status", "open")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(50);

      if (activeFilters.has("hoje")) {
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        q = q.lte("starts_at", end.toISOString());
      }
      if (activeFilters.has("gratis")) q = q.eq("price_cents", 0);
      const modalities = modalitiesForFilters(activeFilters);
      if (modalities.length) q = q.in("field_type", modalities);

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const origin =
    coords ??
    (profile?.latitude != null && profile?.longitude != null
      ? { lat: profile.latitude, lng: profile.longitude }
      : null);

  const enriched: PeladaCardData[] = peladas.map((p) => ({
    ...p,
    distance_km: origin ? haversineKm(origin.lat, origin.lng, p.latitude, p.longitude) : undefined,
  }));

  // Respeita o raio de notificação escolhido pelo usuário (null = qualquer distância)
  const notifyRadius = profile?.notify_radius_km ?? null;
  const withinRadius =
    notifyRadius != null && origin
      ? enriched.filter((p) => p.distance_km != null && p.distance_km <= notifyRadius)
      : enriched;

  const filtered = activeFilters.has("5km")
    ? withinRadius.filter((p) => p.distance_km == null || p.distance_km <= 5)
    : withinRadius;


  const [featured, ...rest] = filtered;

  const toggleFilter = (id: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="active-games-feed min-h-screen bg-navy pb-28">
      <header className="pt-12 px-5 pb-4 sticky top-0 bg-navy/95 backdrop-blur-md z-30">
        <div className="flex items-center justify-between mb-6">
          <NotificationsBell userId={user.id} />

          <div className="flex items-center gap-2 mx-auto absolute left-1/2 -translate-x-1/2">
            <Logo className="size-9 rounded-xl" />
            <h1 className="text-2xl font-display font-extrabold italic tracking-tight text-white">
              Futquick
            </h1>
          </div>

          <Link
            to="/perfil"
            className="size-10 rounded-full bg-cyan/10 border border-cyan/20 grid place-items-center overflow-hidden"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Você" className="w-full h-full object-cover" />
            ) : (
              <span className="text-cyan font-bold text-sm">
                {(profile?.name || user.email || "?")[0]?.toUpperCase()}
              </span>
            )}
          </Link>
        </div>

        <div className="grid grid-cols-2 p-1 mb-3 rounded-full bg-navy-soft border border-white/10">
          <Link to="/mapa" className="py-2 rounded-full text-center text-xs font-bold uppercase tracking-wider text-white/60">
            Mapa
          </Link>
          <span className="py-2 rounded-full text-center text-xs font-bold uppercase tracking-wider bg-cyan text-navy">
            Lista
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-5 px-5">
          {FILTERS.map((f) => {
            const active = activeFilters.has(f.id);
            return (
              <Button
                type="button"
                variant="ghost"
                aria-pressed={active}
                key={f.id}
                onClick={() => toggleFilter(f.id)}
                className={`h-auto whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
                  active ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : "bg-card text-muted-foreground border border-border"
                }`}
              >
                {f.label}
              </Button>
            );
          })}
        </div>
      </header>

      <main className="px-5 pt-2 space-y-4">
        <PendingRatings userId={user.id} />
        <div className="flex justify-between items-end pt-4">
          <span className="discovery-location">
            {profile?.city ? `Perto de ${profile.city}` : plural}
          </span>
          <Link to="/mapa" className="text-xs font-bold text-cyan uppercase tracking-wider">
            Ver mapa →
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-3xl h-72 bg-navy-soft/50 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-12 text-center px-6 py-12 bg-navy-soft/40 rounded-3xl border border-white/5">
            <div className="size-16 rounded-full bg-cyan/10 grid place-items-center mx-auto mb-4">
              <Zap className="size-7 text-cyan" strokeWidth={2.5} />
            </div>
            <h3 className="font-display font-extrabold italic uppercase text-white text-xl">
              Nenhuma pelada por aqui
            </h3>
            <p className="text-white/50 text-sm mt-2 mb-6">
              Seja o primeiro a organizar uma pelada na sua região.
            </p>
            <Link
              to="/criar"
              className="inline-block px-6 py-3 bg-cyan text-navy rounded-2xl font-display font-extrabold italic uppercase text-sm"
            >
              {createLabel}
            </Link>
          </div>
        ) : (
          <>
            {featured && <PeladaCard pelada={featured} featured />}
            {rest.map((p) => (
              <PeladaCard key={p.id} pelada={p} />
            ))}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
