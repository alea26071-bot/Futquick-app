import { useCallback, useEffect, useState, type ReactNode } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useQuery } from "@tanstack/react-query";
import { CircleUserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function useCoverPhotos(paths: string[]) {
  return useQuery({
    queryKey: ["profile-cover-urls", paths],
    queryFn: async () => {
      if (!paths.length) return [];
      const { data, error } = await supabase.storage.from("avatars").createSignedUrls(paths, 3600);
      if (error) throw new Error("Não foi possível carregar as fotos.");
      return (data ?? []).map((photo) => photo.signedUrl || "");
    },
    staleTime: 30 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
  });
}

export function ProfileCover({ paths, fallback, name, children }: { paths: string[]; fallback?: string | null; name: string; children: ReactNode }) {
  const { data: urls = [] } = useCoverPhotos(paths);
  const images = paths.length ? urls : fallback ? [fallback] : [];
  const [viewport, api] = useEmblaCarousel({ loop: false, watchDrag: images.length > 1 });
  const [selected, setSelected] = useState(0);
  const onSelect = useCallback(() => setSelected(api?.selectedScrollSnap() ?? 0), [api]);
  useEffect(() => {
    if (!api) return;
    api.on("select", onSelect).on("reInit", onSelect);
    onSelect();
    return () => { api.off("select", onSelect).off("reInit", onSelect); };
  }, [api, onSelect]);

  return (
    <section className="profile-cover relative overflow-hidden bg-secondary" aria-label={`Fotos de ${name}`} aria-roledescription="carrossel">
      <div className="profile-carousel-viewport" ref={viewport}>
        <div className="profile-carousel-track">
          {images.length ? images.map((url, index) => (
            <div className="profile-carousel-slide" key={`${index}-${url}`} role="group" aria-label={`Foto ${index + 1} de ${images.length}`}>
              <img src={url} alt={`Foto de capa ${index + 1} de ${name}`} draggable={false} className="h-full w-full object-cover object-center" />
            </div>
          )) : <div className="profile-carousel-slide grid place-items-center"><CircleUserRound className="size-28 text-muted-foreground/40" /></div>}
        </div>
      </div>
      <div className="profile-cover-fade pointer-events-none absolute inset-0" />
      {images.length > 1 && <div className="profile-cover-dots" aria-label="Escolher foto">
        {images.map((_, index) => <Button key={index} variant="ghost" size="icon" className="profile-cover-dot" aria-label={`Ver foto ${index + 1}`} aria-pressed={selected === index} onClick={() => api?.scrollTo(index, window.matchMedia("(prefers-reduced-motion: reduce)").matches)}><span /></Button>)}
      </div>}
      {children}
    </section>
  );
}