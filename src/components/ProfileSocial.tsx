import { useEffect, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { CircleUserRound, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getSocialList, getSocialSummary, setFollow } from "@/lib/social.functions";
import { mutualLabel, type SocialMode } from "@/lib/social";

export function ProfileSocial({ profileId, viewerId }: { profileId: string; viewerId: string }) {
  const summaryFn = useServerFn(getSocialSummary);
  const listFn = useServerFn(getSocialList);
  const followFn = useServerFn(setFollow);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [mode, setMode] = useState<SocialMode | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { const timer = setTimeout(() => setDebounced(search.trim()), 250); return () => clearTimeout(timer); }, [search]);
  const summary = useQuery({ queryKey: ["social", viewerId, profileId, "summary"], queryFn: () => summaryFn({ data: { profileId } }), refetchInterval: 30000 });
  const list = useInfiniteQuery({
    queryKey: ["social", viewerId, profileId, mode, debounced],
    queryFn: ({ pageParam }) => listFn({ data: { profileId, mode: mode ?? "followers", search: debounced, offset: pageParam } }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => { const loaded = pages.reduce((sum, page) => sum + page.items.length, 0); return loaded < last.total ? loaded : undefined; },
    enabled: mode !== null,
  });
  const open = (next: SocialMode) => { setSearch(""); setDebounced(""); setMode(next); };
  const toggle = async (targetId: string, following: boolean) => {
    setBusy(targetId);
    try {
      await followFn({ data: { targetId, following: !following } });
      await Promise.all([qc.invalidateQueries({ queryKey: ["social"] }), qc.invalidateQueries({ queryKey: ["is-following"] }), qc.invalidateQueries({ queryKey: ["following"] })]);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível atualizar."); }
    finally { setBusy(null); }
  };
  const label = summary.data && profileId !== viewerId ? mutualLabel(summary.data.mutual.names, summary.data.mutual.total) : null;
  return <>
    <div className="mt-3 flex justify-center gap-8" aria-label="Relacionamentos do perfil">
      {(["followers", "following"] as const).map((item) => <Button key={item} variant="ghost" onClick={() => open(item)} aria-label={item === "followers" ? "Seguidores" : "Seguindo"} className="h-auto min-h-12 flex-col gap-0.5 px-4 py-1.5">
        <strong className="text-lg leading-tight tabular-nums">{summary.data?.[item] ?? "—"}</strong><span className="text-xs text-muted-foreground">{item === "followers" ? "Seguidores" : "Seguindo"}</span>
      </Button>)}
    </div>
    {summary.isError && <Button variant="ghost" className="text-xs text-muted-foreground" onClick={() => summary.refetch()}>Tentar novamente</Button>}
    {label && <Button variant="ghost" onClick={() => open("mutual")} className="mt-1 h-auto w-full whitespace-normal text-xs text-muted-foreground">{label}</Button>}
    <Sheet open={mode !== null} onOpenChange={(value) => { if (!value) setMode(null); }}>
      <SheetContent side="bottom" aria-describedby={undefined} className="mx-auto flex h-[min(80dvh,700px)] max-w-lg flex-col rounded-t-2xl border-border bg-background pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <SheetHeader><SheetTitle>{mode === "mutual" ? "Seguidores em comum" : mode === "following" ? "Seguindo" : "Seguidores"}</SheetTitle></SheetHeader>
        <div className="relative mt-4"><Search aria-hidden="true" className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label="Buscar usuários" placeholder="Buscar nome ou @usuário" value={search} onChange={(e) => setSearch(e.target.value.replace(/^@/, "").slice(0, 80))} className="pl-9" /></div>
        <div className="mt-3 flex-1 space-y-1 overflow-y-auto" aria-busy={list.isFetching}>
          {list.isPending && <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>}
          {list.isError && <Button variant="ghost" onClick={() => list.refetch()} className="w-full">Tentar novamente</Button>}
          {list.data?.pages.flatMap((page) => page.items).map((person) => <div key={person.id} className="flex items-center gap-2 py-2">
            <Button variant="ghost" onClick={() => { setMode(null); if (person.id === viewerId) navigate({ to: "/perfil" }); else navigate({ to: "/jogador/$userId", params: { userId: person.id } }); }} className="h-auto min-w-0 flex-1 justify-start gap-3 px-1 py-1 text-left">
              {person.avatar_url ? <img src={person.avatar_url} alt="" className="size-11 shrink-0 rounded-full object-cover" /> : <CircleUserRound className="size-11 shrink-0 text-muted-foreground" />}
              <span className="min-w-0"><strong className="block truncate text-sm">{person.name}</strong><span className="block truncate text-xs text-muted-foreground">@{person.username || person.name.toLowerCase().replace(/[^a-z0-9]/g, "") || "jogador"}</span></span>
            </Button>
            {person.id !== viewerId && <Button variant={person.following ? "secondary" : "default"} size="sm" disabled={busy !== null} aria-label={`${person.following ? "Deixar de seguir" : "Seguir"} ${person.name}`} onClick={() => toggle(person.id, person.following)} className="min-h-10 min-w-20 shrink-0">{person.following ? "Seguindo" : "Seguir"}</Button>}
          </div>)}
          {list.data?.pages[0]?.total === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</p>}
          {list.hasNextPage && <Button variant="ghost" disabled={list.isFetchingNextPage} onClick={() => list.fetchNextPage()} className="w-full">Carregar mais</Button>}
        </div>
      </SheetContent>
    </Sheet>
  </>;
}