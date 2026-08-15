import { useEffect, useMemo, useState } from "react";
import { Check, MapPin } from "lucide-react";
import { fetchCities, fetchStates, filterByPrefix, normalize, type BrState } from "@/lib/br-locations";

/**
 * Estado + cidade com sugestões em tempo real (IBGE).
 * Só chama onChange com valores existentes na base do IBGE.
 */
export function StateCityPicker({
  state,
  city,
  onChange,
}: {
  state: string;
  city: string;
  onChange: (v: { state: string; city: string }) => void;
}) {
  const [states, setStates] = useState<BrState[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [stateQuery, setStateQuery] = useState("");
  const [cityQuery, setCityQuery] = useState(city);
  const [openState, setOpenState] = useState(false);
  const [openCity, setOpenCity] = useState(false);

  useEffect(() => {
    fetchStates().then(setStates).catch(() => setStates([]));
  }, []);

  useEffect(() => {
    if (!state) {
      setCities([]);
      return;
    }
    fetchCities(state).then(setCities).catch(() => setCities([]));
  }, [state]);

  const stateLabel = useMemo(() => {
    const s = states.find((x) => x.sigla === state);
    return s ? `${s.nome} (${s.sigla})` : "";
  }, [states, state]);

  const stateMatches = useMemo(() => {
    const q = normalize(stateQuery);
    if (!q) return states.slice(0, 8);
    return states
      .filter((s) => normalize(s.nome).includes(q) || normalize(s.sigla) === q)
      .slice(0, 8);
  }, [states, stateQuery]);

  const cityMatches = useMemo(
    () => (cities.length ? filterByPrefix(cities, cityQuery, 6) : []),
    [cities, cityQuery],
  );

  const cityValid = !!city && cities.some((c) => c === city);

  return (
    <div className="space-y-4">
      <div className="space-y-2 relative">
        <label className="text-white/60 text-xs uppercase tracking-wide">Estado</label>
        <input
          value={openState ? stateQuery : stateLabel || stateQuery}
          onChange={(e) => {
            setStateQuery(e.target.value);
            setOpenState(true);
          }}
          onFocus={() => {
            setStateQuery("");
            setOpenState(true);
          }}
          placeholder="Digite seu estado"
          className="w-full text-lg font-bold bg-navy-soft rounded-2xl border-2 border-cyan/40 py-4 px-4 focus:border-cyan outline-none text-white placeholder:text-white/30"
        />
        {openState && stateMatches.length > 0 && (
          <div className="absolute z-30 top-full left-0 right-0 mt-2 bg-navy-soft rounded-2xl border border-white/10 overflow-hidden">
            {stateMatches.map((s) => (
              <button
                key={s.sigla}
                onClick={() => {
                  onChange({ state: s.sigla, city: "" });
                  setCityQuery("");
                  setStateQuery("");
                  setOpenState(false);
                }}
                className="w-full px-4 py-3 text-left text-sm text-white hover:bg-navy border-b border-white/5 last:border-0"
              >
                {s.nome} <span className="text-cyan font-mono">{s.sigla}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2 relative">
        <label className="text-white/60 text-xs uppercase tracking-wide">Cidade</label>
        <input
          disabled={!state}
          value={cityQuery}
          onChange={(e) => {
            setCityQuery(e.target.value);
            setOpenCity(true);
            if (city) onChange({ state, city: "" });
          }}
          onFocus={() => setOpenCity(true)}
          placeholder={state ? "Digite sua cidade" : "Escolha o estado primeiro"}
          className="w-full text-lg font-bold bg-navy-soft rounded-2xl border-2 border-cyan/40 py-4 px-4 focus:border-cyan outline-none text-white placeholder:text-white/30 disabled:opacity-40"
        />
        {cityValid && (
          <p className="text-cyan text-xs flex items-center gap-1">
            <Check className="size-3" /> {city} · {state}
          </p>
        )}
        {openCity && !cityValid && cityMatches.length > 0 && (
          <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-navy-soft rounded-2xl border border-white/10 overflow-hidden">
            {cityMatches.map((c) => (
              <button
                key={c}
                onClick={() => {
                  onChange({ state, city: c });
                  setCityQuery(c);
                  setOpenCity(false);
                }}
                className="w-full px-4 py-3 text-left text-sm text-white hover:bg-navy border-b border-white/5 last:border-0 flex items-center gap-2"
              >
                <MapPin className="size-4 text-cyan flex-none" />
                {c}
              </button>
            ))}
          </div>
        )}
        {openCity && !cityValid && !!state && cityQuery.length > 1 && cityMatches.length === 0 && (
          <p className="text-red-400 text-xs">Cidade não encontrada nesse estado.</p>
        )}
      </div>
    </div>
  );
}
