import { useEffect, useRef, useState } from "react";
import { GoogleMap, loadGoogleMaps } from "./GoogleMap";
import { Check, X, MapPin, LocateFixed } from "lucide-react";
import { toast } from "sonner";

export interface LocationResult {
  name: string;
  address: string;
  city: string | null;
  lat: number;
  lng: number;
}

export function LocationPicker({
  onConfirm,
  onClose,
}: {
  onConfirm: (loc: LocationResult) => void;
  onClose: () => void;
}) {
  const [center, setCenter] = useState({ lat: -23.5505, lng: -46.6333 });
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [details, setDetails] = useState<LocationResult | null>(null);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ description: string; place_id: string }>>([]);
  const [loading, setLoading] = useState(false);
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
        {
          input: search,
          sessionToken: sessionRef.current,
          componentRestrictions: { country: "br" },
        },
        (preds: any[]) => setSuggestions(preds?.slice(0, 5) ?? []),
      );
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const reverseGeocode = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const res: any = await new Promise((resolve, reject) => {
        geocoderRef.current.geocode({ location: { lat, lng } }, (results: any, status: string) => {
          if (status === "OK") resolve(results);
          else reject(status);
        });
      });
      const first = res?.[0];
      if (!first) throw new Error("Endereço não encontrado");
      const cityComp = first.address_components?.find((c: any) =>
        c.types.includes("administrative_area_level_2") || c.types.includes("locality"),
      );
      setDetails({
        name: first.formatted_address.split(",")[0],
        address: first.formatted_address,
        city: cityComp?.long_name ?? null,
        lat,
        lng,
      });
    } catch (e) {
      toast.error("Não foi possível identificar esse endereço");
    } finally {
      setLoading(false);
    }
  };

  const selectSuggestion = (place_id: string, description: string) => {
    setSuggestions([]);
    setSearch(description);
    placesRef.current.getDetails(
      { placeId: place_id, fields: ["geometry", "formatted_address", "name", "address_components"] },
      (place: any) => {
        if (!place?.geometry) return;
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setCenter({ lat, lng });
        setPin({ lat, lng });
        const cityComp = place.address_components?.find((c: any) =>
          c.types.includes("administrative_area_level_2") || c.types.includes("locality"),
        );
        setDetails({
          name: place.name || description.split(",")[0],
          address: place.formatted_address,
          city: cityComp?.long_name ?? null,
          lat,
          lng,
        });
      },
    );
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(c);
        setPin(c);
        reverseGeocode(c.lat, c.lng);
      },
      () => setLoading(false),
      { enableHighAccuracy: true },
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-navy flex flex-col">
      <div className="pt-12 px-4 pb-3 flex items-center gap-3 bg-navy/95 backdrop-blur-md z-20 relative">
        <button onClick={onClose} className="size-10 rounded-full bg-navy-soft border border-white/10 grid place-items-center">
          <X className="size-5 text-white" />
        </button>
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar quadra, endereço, cidade..."
            className="w-full px-4 py-3 rounded-full bg-navy-soft border border-white/10 text-white placeholder:text-white/30 text-sm focus:border-cyan focus:outline-none"
          />
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-navy-soft rounded-2xl border border-white/10 overflow-hidden z-30">
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
      </div>

      <div className="flex-1 relative">
        <GoogleMap
          center={center}
          zoom={pin ? 16 : 13}
          markers={pin ? [{ lat: pin.lat, lng: pin.lng }] : []}
          onClick={(c) => {
            setPin(c);
            reverseGeocode(c.lat, c.lng);
          }}
          className="absolute inset-0"
        />

        <button
          onClick={useCurrentLocation}
          className="absolute top-4 right-4 size-11 rounded-full bg-navy-soft border border-white/10 grid place-items-center shadow-lg"
        >
          <LocateFixed className="size-5 text-cyan" />
        </button>

        {!pin && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="bg-navy/80 backdrop-blur-md px-4 py-2 rounded-full text-xs text-white/70 font-medium">
              Toque no mapa ou busque um local
            </div>
          </div>
        )}

        {details && (
          <div className="absolute bottom-4 left-4 right-4 bg-navy-soft rounded-3xl border border-white/10 shadow-2xl p-5 animate-slide-up">
            <div className="flex items-start gap-3 mb-4">
              <div className="size-10 rounded-xl bg-cyan/10 grid place-items-center flex-none">
                <MapPin className="size-5 text-cyan" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-extrabold italic uppercase text-white truncate">{details.name}</h3>
                <p className="text-xs text-white/60 mt-1">{details.address}</p>
                {details.city && <p className="text-xs text-cyan font-mono font-bold mt-1">{details.city.toUpperCase()}</p>}
              </div>
            </div>
            <button
              onClick={() => onConfirm(details)}
              disabled={loading}
              className="w-full py-4 bg-cyan text-navy rounded-2xl font-display font-extrabold italic uppercase flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Check className="size-5" strokeWidth={3} />
              Confirmar local
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
