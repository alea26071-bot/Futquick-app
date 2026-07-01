import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { GoogleMap } from "@/components/GoogleMap";
import { FIELD_TYPE_LABEL, LEVEL_LABEL, formatPrice, timeUntil } from "@/lib/pelada-utils";
import { ChevronRight, MapPin, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/mapa")({
  ssr: false,
  component: MapaPage,
});

const DEFAULT_CENTER = { lat: -23.5505, lng: -46.6333 }; // São Paulo

function MapaPage() {
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
    );
  }, []);

  const { data: peladas = [] } = useQuery({
    queryKey: ["peladas", "map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("peladas")
        .select("*")
        .eq("status", "open")
        .gte("starts_at", new Date().toISOString())
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const markers = useMemo(
    () =>
      peladas.map((p) => ({
        lat: p.latitude,
        lng: p.longitude,
        title: p.name,
        onClick: () => setSelected(p.id),
      })),
    [peladas],
  );

  const selectedPelada = peladas.find((p) => p.id === selected);

  return (
    <div className="h-screen bg-navy relative overflow-hidden">
      <GoogleMap center={center} zoom={13} markers={markers} className="absolute inset-0" />

      <div className="absolute top-0 left-0 right-0 pt-12 px-5 pb-4 bg-gradient-to-b from-navy to-transparent z-20">
        <div className="flex items-center gap-3">
          <Link to="/descobrir" className="size-10 rounded-full bg-navy/80 backdrop-blur-md border border-white/10 grid place-items-center">
            <ArrowLeft className="size-5 text-white" />
          </Link>
          <div className="flex-1 px-4 py-3 rounded-full bg-navy/80 backdrop-blur-md border border-white/10">
            <input
              type="text"
              placeholder="Buscar cidade ou local..."
              className="w-full bg-transparent text-white placeholder:text-white/40 text-sm focus:outline-none"
            />
          </div>
        </div>
      </div>

      {selectedPelada && (
        <div className="absolute bottom-24 left-4 right-4 z-30 animate-slide-up">
          <Link
            to="/pelada/$peladaId"
            params={{ peladaId: selectedPelada.id }}
            className="block bg-navy-soft rounded-3xl border border-white/10 shadow-2xl p-5"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="text-mono-label mb-1">{timeUntil(selectedPelada.starts_at)}</p>
                <h3 className="font-display font-extrabold italic uppercase text-white text-lg leading-tight">
                  {selectedPelada.name}
                </h3>
              </div>
              <span className="font-mono text-cyan font-bold whitespace-nowrap">{formatPrice(selectedPelada.price_cents)}</span>
            </div>
            <div className="flex items-center gap-2 text-white/60 text-xs mb-3">
              <MapPin className="size-3 flex-none" />
              <span className="truncate">{selectedPelada.location_name}</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <div className="flex gap-2 text-[10px] font-bold uppercase">
                <span className="px-2 py-1 rounded bg-navy text-cyan border border-white/10">
                  {FIELD_TYPE_LABEL[selectedPelada.field_type]}
                </span>
                <span className="px-2 py-1 rounded bg-navy text-white/60 border border-white/10">
                  {LEVEL_LABEL[selectedPelada.level]}
                </span>
              </div>
              <ChevronRight className="size-5 text-cyan" />
            </div>
          </Link>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
