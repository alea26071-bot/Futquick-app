import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { PeladaCard, type PeladaCardData } from "@/components/PeladaCard";
import { haversineKm } from "@/lib/pelada-utils";
import { Zap, Bell } from "lucide-react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/_authenticated/descobrir")({
  ssr: false,
  component: DescobrirPage,
});

const FILTERS = [
  { id: "hoje", label: "Hoje" },
  { id: "5km", label: "Até 5km" },
  { id: "gratis", label: "Grátis" },
  { id: "society", label: "Society" },
  { id: "campo", label: "Campo" },
  { id: "futsal", label: "Futsal" },
] as const;

function DescobrirPage() {
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
      for (const t of ["society", "campo", "futsal"]) {
        if (activeFilters.has(t)) q = q.eq("field_type", t);
      }

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
    <div className="min-h-screen bg-navy pb-28">
      <header className="pt-12 px-5 pb-4 sticky top-0 bg-navy/95 backdrop-blur-md z-30">
        <div className="relative flex items-center justify-center mb-6 h-10">
          <button
            aria-label="Notificações"
            className="absolute left-0 size-10 rounded-full bg-navy-soft border border-white/10 grid place-items-center"
          >
            <Bell className="size-4 text-white/70" />
            <span className="absolute top-2 right-2 size-2 bg-cyan rounded-full" />
          </button>

          <div className="flex items-center gap-2">
            <Logo className="size-9 rounded-xl" />
            <h1 className="text-2xl font-display font-extrabold italic tracking-tight text-white">
              Futquick
            </h1>
          </div>

          <Link
            to="/perfil"
            className="absolute right-0 size-10 rounded-full bg-cyan/10 border border-cyan/20 grid place-items-center overflow-hidden"
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

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-5 px-5">
          {FILTERS.map((f) => {
            const active = activeFilters.has(f.id);
            return (
              <button
                key={f.id}
                onClick={() => toggleFilter(f.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
                  active ? "bg-cyan text-navy" : "bg-navy-soft text-white/60 border border-white/10"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="px-5 pt-2 space-y-4">
        <div className="flex justify-between items-end pt-4">
          <span className="text-mono-label">
            {profile?.city ? `Perto de ${profile.city}` : "Peladas próximas"}
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
              Criar Pelada
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
