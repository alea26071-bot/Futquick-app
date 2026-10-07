import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { GoogleMap, loadGoogleMaps } from "@/components/GoogleMap";
import { FIELD_TYPE_LABEL, LEVEL_LABEL, formatPrice, timeUntil } from "@/lib/pelada-utils";
import { ChevronRight, MapPin, ArrowLeft, Search, Plus, X, LocateFixed } from "lucide-react";

export const Route = createFileRoute("/_authenticated/mapa")({
  ssr: false,
  component: MapaPage,
});

const DEFAULT_CENTER = { lat: -23.5505, lng: -46.6333 };

function MapaPage() {
  const navigate = useNavigate();
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ description: string; place_id: string }>>([]);
  const [pinFromMap, setPinFromMap] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const autocompleteRef = useRef<any>(null);
  const placesRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const sessionRef = useRef<any>(null);

  useEffect(() => {
    loadGoogleMaps().then(() => {
      autocompleteRef.current = new window.google.maps.places.AutocompleteService();
      geocoderRef.current = new window.google.maps.Geocoder();
      const div = document.createElement("div");
      placesRef.current = new window.google.maps.places.PlacesService(div);
      sessionRef.current = new window.google.maps.places.AutocompleteSessionToken();
    });
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
      );
    }
  }, []);

  useEffect(() => {
    if (!search || !autocompleteRef.current) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      autocompleteRef.current.getPlacePredictions(
        { input: search, sessionToken: sessionRef.current, componentRestrictions: { country: "br" } },
        (preds: any[]) => setSuggestions(preds?.slice(0, 5) ?? []),
      );
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const selectSuggestion = (place_id: string, description: string) => {
    setSuggestions([]);
    setSearch(description);
    placesRef.current.getDetails(
      { placeId: place_id, fields: ["geometry", "formatted_address"] },
      (place: any) => {
        if (!place?.geometry) return;
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setCenter({ lat, lng });
        setPinFromMap({ lat, lng, address: place.formatted_address });
      },
    );
  };

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

  const createAtPin = () => {
    if (!pinFromMap) return;
    navigate({
      to: "/criar",
      search: { lat: pinFromMap.lat, lng: pinFromMap.lng, address: pinFromMap.address ?? "" },
    });
  };

  // Long-press → pin + reverse geocode
  const handleMapClick = (c: { lat: number; lng: number }) => {
    setSelected(null);
    setPinFromMap({ lat: c.lat, lng: c.lng });
    if (geocoderRef.current) {
      geocoderRef.current.geocode({ location: c }, (res: any, status: string) => {
        if (status === "OK" && res?.[0]) {
          setPinFromMap({ lat: c.lat, lng: c.lng, address: res[0].formatted_address });
        }
      });
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true },
    );
  };

  return (
    <div className="h-screen bg-navy relative overflow-hidden">
      <GoogleMap
        center={center}
        zoom={13}
        markers={pinFromMap ? [...markers, { lat: pinFromMap.lat, lng: pinFromMap.lng, title: "Novo local" }] : markers}
        onClick={handleMapClick}
        className="absolute inset-0"
      />

      {/* Top: back + search */}
      <div className="absolute top-0 left-0 right-0 pt-12 px-4 pb-4 z-20">
        <div className="grid grid-cols-2 p-1 mb-3 rounded-full bg-navy border border-white/10 shadow-lg">
          <span className="py-2 rounded-full text-center text-xs font-bold uppercase tracking-wider bg-cyan text-navy">Mapa</span>
          <Link to="/descobrir" className="py-2 rounded-full text-center text-xs font-bold uppercase tracking-wider text-white/60">Lista</Link>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/descobrir" className="size-11 rounded-full bg-navy border border-white/10 grid place-items-center shadow-lg flex-none">
            <ArrowLeft className="size-5 text-white" />
          </Link>
          <div className="flex-1 relative">
            <div className="flex items-center gap-2 px-4 py-3 rounded-full bg-navy border border-white/10 shadow-lg">
              <Search className="size-4 text-white/50 flex-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar endereço ou quadra..."
                className="flex-1 bg-transparent text-white placeholder:text-white/40 text-sm focus:outline-none"
              />
              {search && (
                <button onClick={() => { setSearch(""); setSuggestions([]); }} aria-label="Limpar">
                  <X className="size-4 text-white/50" />
                </button>
              )}
            </div>
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-navy-soft rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                {suggestions.map((s) => (
                  <button
                    key={s.place_id}
                    onClick={() => selectSuggestion(s.place_id, s.description)}
                    className="w-full px-4 py-3 text-left text-sm text-white hover:bg-navy border-b border-white/5 last:border-0 flex items-start gap-2"
                  >
                    <MapPin className="size-4 text-cyan flex-none mt-0.5" />
                    <span className="truncate">{s.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={useCurrentLocation}
            aria-label="Minha localização"
            className="size-11 rounded-full bg-navy border border-white/10 grid place-items-center shadow-lg flex-none"
          >
            <LocateFixed className="size-5 text-cyan" />
          </button>
        </div>
        <p className="text-[11px] text-white/60 text-center mt-3 bg-navy/60 backdrop-blur-md rounded-full py-1.5 px-3 mx-auto w-fit">
          Toque em qualquer lugar do mapa para criar um jogo
        </p>
      </div>

      {/* Selected pelada card */}
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

      {/* Create-here floating action */}
      {pinFromMap && !selectedPelada && (
        <div className="absolute bottom-24 left-4 right-4 z-30 animate-slide-up">
          <div className="bg-navy-soft rounded-3xl border border-cyan/30 shadow-2xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="size-10 rounded-xl bg-cyan/10 grid place-items-center flex-none">
                <MapPin className="size-5 text-cyan" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-mono-label mb-0.5">Local escolhido</p>
                <p className="text-white text-sm font-bold truncate">
                  {pinFromMap.address ?? `${pinFromMap.lat.toFixed(5)}, ${pinFromMap.lng.toFixed(5)}`}
                </p>
              </div>
              <button
                onClick={() => setPinFromMap(null)}
                aria-label="Cancelar"
                className="size-8 rounded-full grid place-items-center text-white/50"
              >
                <X className="size-4" />
              </button>
            </div>
            <button
              onClick={createAtPin}
              className="w-full py-3 bg-cyan text-navy rounded-2xl font-display font-extrabold italic uppercase flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Plus className="size-5" strokeWidth={3} />
              Criar jogo aqui
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
