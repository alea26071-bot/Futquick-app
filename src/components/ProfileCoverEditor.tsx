import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, ImagePlus, LoaderCircle, Replace, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useCoverPhotos } from "./ProfileCover";
import { uploadUserPhotoPath } from "@/lib/storage-helpers";
import { moveCoverPhoto, validateCoverSelection } from "@/lib/profile-cover";
import { saveProfileCoverPhotos } from "@/lib/profile-cover.functions";
import { supabase } from "@/integrations/supabase/client";

export function ProfileCoverEditor({ userId, paths, open, onOpenChange }: { userId: string; paths: string[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const qc = useQueryClient();
  const savePhotos = useServerFn(saveProfileCoverPhotos);
  const { data: urls = [] } = useCoverPhotos(paths);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const replacement = useRef<number | null>(null);
  const [replacing, setReplacing] = useState(false);
  const persist = async (next: string[]) => {
    await savePhotos({ data: next });
    const removed = paths.filter((path) => !next.includes(path));
    if (removed.length) await supabase.storage.from("avatars").remove(removed);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["profile", userId] }),
      qc.invalidateQueries({ queryKey: ["player-profile", userId] }),
    ]);
  };
  const change = async (next: string[]) => {
    setBusy(true);
    try { await persist(next); toast.success("Fotos atualizadas"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível atualizar as fotos"); }
    finally { setBusy(false); }
  };
  const pick = (index: number | null) => {
    replacement.current = index;
    setReplacing(index !== null);
    if (input.current) {
      input.current.multiple = index === null;
      input.current.click();
    }
  };
  const upload = async (files: File[]) => {
    if (busy || !files.length) return;
    const index = replacement.current;
    try { validateCoverSelection(files, paths.length, index); }
    catch (error) { return toast.error(error instanceof Error ? error.message : "Seleção inválida."); }
    setBusy(true);
    let uploaded: string[] = [];
    let saved = false;
    try {
      const results = await Promise.allSettled(files.map((file) => uploadUserPhotoPath("avatars", userId, file, `cover-${crypto.randomUUID()}`)));
      uploaded = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
      const failure = results.find((result) => result.status === "rejected");
      if (failure?.status === "rejected") throw failure.reason;
      const next = [...paths];
      if (index === null) next.push(...uploaded); else {
        const path = uploaded[0];
        if (!path) throw new Error("Não foi possível enviar a foto.");
        next[index] = path;
      }
      await persist(next);
      saved = true;
      toast.success(files.length > 1 ? "Fotos adicionadas" : "Foto atualizada");
    } catch (error) {
      if (!saved && uploaded.length) await supabase.storage.from("avatars").remove(uploaded);
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar as fotos");
    }
    finally { setBusy(false); }
  };
  return <Sheet open={open} onOpenChange={(value) => { if (!busy) onOpenChange(value); }}>
    <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto bg-background text-foreground" onInteractOutside={(event) => { if (busy) event.preventDefault(); }}>
      <div className="mx-auto max-w-lg">
        <SheetHeader><SheetTitle>Fotos de capa</SheetTitle><SheetDescription>{paths.length}/3 fotos</SheetDescription></SheetHeader>
        <div className="mt-5 space-y-3">
          {paths.map((path, index) => <div key={path} className="flex items-center gap-3 border-b border-border pb-3">
            <img src={urls[index]} alt={`Foto ${index + 1}`} className="h-20 w-24 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1"><p className="mb-2 text-sm font-semibold">Foto {index + 1}</p><div className="flex flex-wrap gap-1">
              <Button size="icon" variant="outline" title="Mover para a esquerda" aria-label={`Mover foto ${index + 1} para a esquerda`} disabled={busy || index === 0} onClick={() => change(moveCoverPhoto(paths, index, -1))}><ArrowLeft /></Button>
              <Button size="icon" variant="outline" title="Mover para a direita" aria-label={`Mover foto ${index + 1} para a direita`} disabled={busy || index === paths.length - 1} onClick={() => change(moveCoverPhoto(paths, index, 1))}><ArrowRight /></Button>
              <Button size="icon" variant="outline" title="Substituir foto" aria-label={`Substituir foto ${index + 1}`} disabled={busy} onClick={() => pick(index)}><Replace /></Button>
              <Button size="icon" variant="outline" title="Remover foto" aria-label={`Remover foto ${index + 1}`} disabled={busy} onClick={() => change(paths.filter((_, i) => i !== index))}><Trash2 className="text-destructive" /></Button>
            </div></div>
          </div>)}
        </div>
        <Button className="mt-5 w-full" variant="outline" disabled={busy || paths.length >= 3} onClick={() => pick(null)}>{busy ? <LoaderCircle className="animate-spin" /> : <ImagePlus />} {busy ? "Enviando fotos…" : "Adicionar fotos"}</Button>
        <input ref={input} type="file" accept="image/*" multiple={!replacing} disabled={busy} className="hidden" onChange={(event) => { const files = Array.from(event.target.files ?? []); if (files.length) void upload(files); event.currentTarget.value = ""; }} />
      </div>
    </SheetContent>
  </Sheet>;
}