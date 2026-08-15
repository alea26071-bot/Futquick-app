// Estados e municípios brasileiros (fonte: IBGE), com cache em memória.

export interface BrState {
  id: number;
  sigla: string;
  nome: string;
}

let statesCache: BrState[] | null = null;
const citiesCache = new Map<string, string[]>();

export async function fetchStates(): Promise<BrState[]> {
  if (statesCache) return statesCache;
  const res = await fetch(
    "https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome",
  );
  if (!res.ok) throw new Error("Não foi possível carregar os estados");
  const data = (await res.json()) as BrState[];
  statesCache = data.map((s) => ({ id: s.id, sigla: s.sigla, nome: s.nome }));
  return statesCache;
}

export async function fetchCities(uf: string): Promise<string[]> {
  const key = uf.toUpperCase();
  const cached = citiesCache.get(key);
  if (cached) return cached;
  const res = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${key}/municipios?orderBy=nome`,
  );
  if (!res.ok) throw new Error("Não foi possível carregar as cidades");
  const data = (await res.json()) as Array<{ nome: string }>;
  const names = data.map((c) => c.nome);
  citiesCache.set(key, names);
  return names;
}

export function normalize(v: string): string {
  return (v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function filterByPrefix(list: string[], query: string, limit = 6): string[] {
  const q = normalize(query);
  if (!q) return list.slice(0, limit);
  const starts: string[] = [];
  const contains: string[] = [];
  for (const item of list) {
    const n = normalize(item);
    if (n.startsWith(q)) starts.push(item);
    else if (n.includes(q)) contains.push(item);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}
