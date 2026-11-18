import { createContext, useContext, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { saveGameTerm } from "@/lib/game-term.functions";
import { REGIONAL_GAME_TERMS, gameTermSchema, gameListLabels } from "@/lib/game-term";

const GameTermContext = createContext({ createLabel: "Criar jogo", ...gameListLabels(null) });
export const useGameTerm = () => useContext(GameTermContext);

export function GameTermProvider({ initialTerm, userId, children }: { initialTerm: string | null; userId: string; children: ReactNode }) {
  const [term, setTerm] = useState(initialTerm);
  const [open, setOpen] = useState(initialTerm === null);
  const [choice, setChoice] = useState("");
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const save = useServerFn(saveGameTerm);
  const qc = useQueryClient();
  const selected = choice === "Outro" ? custom.trim() : choice;
  const valid = gameTermSchema.safeParse(selected).success;
  const persist = async (value: string) => {
    setBusy(true);
    try {
      const result = await save({ data: { term: value } });
      setTerm(result.term);
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["profile", userId] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar");
    } finally { setBusy(false); }
  };
  return <GameTermContext.Provider value={{ createLabel: `Criar ${term?.toLocaleLowerCase("pt-BR") || "jogo"}`, ...gameListLabels(term) }}>
    {children}
    <Dialog open={open} onOpenChange={(value) => { if (!value && !busy) void persist("Jogo"); }}>
      <DialogContent className="w-[calc(100%-32px)] max-w-sm rounded-2xl border-border bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="font-display font-extrabold italic uppercase leading-tight pr-5">Como se chama o jogo na sua região?</DialogTitle>
          <DialogDescription>Escolha o nome que você costuma usar.</DialogDescription>
        </DialogHeader>
        <div role="radiogroup" aria-label="Nome regional" className="grid grid-cols-2 gap-3">
          {REGIONAL_GAME_TERMS.map((name) => <Button key={name} role="radio" aria-checked={choice === name} disabled={busy} variant={choice === name ? "default" : "outline"} className="h-12 rounded-xl" onClick={() => setChoice(name)}>{choice === name && <Check aria-hidden="true" />}{name}</Button>)}
        </div>
        {choice === "Outro" && <div className="space-y-2">
          <label htmlFor="regional-game-name" className="text-sm font-semibold">Qual nome você usa?</label>
          <input id="regional-game-name" autoFocus maxLength={30} value={custom} disabled={busy} onChange={(e) => setCustom(e.target.value)} placeholder="Digite o nome" className="h-12 w-full rounded-xl border border-input bg-background px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          {custom.length > 0 && !valid && <p className="text-xs text-destructive">Use de 2 a 30 caracteres, sem símbolos &lt; ou &gt;.</p>}
        </div>}
        <Button disabled={!valid || busy} className="h-12 rounded-xl font-bold" onClick={() => void persist(selected)}>{busy ? "Salvando…" : "Salvar preferência"}</Button>
        <Button variant="ghost" disabled={busy} onClick={() => void persist("Jogo")}>Usar “jogo”</Button>
      </DialogContent>
    </Dialog>
  </GameTermContext.Provider>;
}