import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const REASONS = {
  pelada: ["Conteúdo inadequado", "Evento falso", "Spam", "Fraude/golpe", "Localização suspeita", "Comportamento inadequado", "Outro"],
  user: ["Comportamento inadequado", "Assédio", "Spam", "Fraude", "Perfil falso", "Conteúdo ofensivo", "Outro"],
  message: ["Conteúdo ofensivo", "Assédio", "Spam", "Fraude/golpe", "Conteúdo inadequado", "Outro"],
} as const;

export type ReportTarget =
  | { type: "pelada"; peladaId: string; reportedUserId?: string }
  | { type: "user"; reportedUserId: string }
  | { type: "message"; messageId: string; source: "group" | "direct"; body: string; reportedUserId: string; peladaId?: string };

export function ReportSheet({
  open,
  onOpenChange,
  target,
  reporterId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  target: ReportTarget | null;
  reporterId: string;
}) {
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  if (!target) return null;

  const submit = async () => {
    if (!reason) return;
    setSending(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: reporterId,
      target_type: target.type,
      reason,
      details: details.trim() || null,
      pelada_id: "peladaId" in target ? (target.peladaId ?? null) : null,
      reported_user_id: "reportedUserId" in target ? (target.reportedUserId ?? null) : null,
      message_id: target.type === "message" ? target.messageId : null,
      message_source: target.type === "message" ? target.source : null,
      message_body: target.type === "message" ? target.body.slice(0, 2000) : null,
    });
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success("Denúncia enviada. Obrigado por ajudar a manter o Futquick seguro.");
    setReason(null);
    setDetails("");
    onOpenChange(false);
  };

  const title = target.type === "pelada" ? "Denunciar pelada" : target.type === "user" ? "Denunciar usuário" : "Denunciar mensagem";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-navy border-white/10 rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white font-display font-extrabold italic uppercase">{title}</SheetTitle>
        </SheetHeader>
        <div className="space-y-2 mt-4">
          {REASONS[target.type].map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={`w-full text-left px-4 py-3 rounded-2xl border text-sm font-bold ${
                reason === r ? "bg-cyan text-navy border-cyan" : "bg-navy-soft text-white/80 border-white/10"
              }`}
            >
              {r}
            </button>
          ))}
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={500}
            placeholder="Detalhes (opcional)"
            className="w-full mt-2 p-3 rounded-2xl bg-navy-soft border border-white/10 text-white text-sm"
            rows={3}
          />
          <button
            onClick={submit}
            disabled={!reason || sending}
            className="w-full py-4 rounded-2xl bg-destructive text-white font-display font-extrabold italic uppercase disabled:opacity-40"
          >
            {sending ? "Enviando..." : "Enviar denúncia"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
