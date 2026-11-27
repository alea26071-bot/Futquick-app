import { useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowLeft, ChevronRight, FileText, ShieldCheck, Check, AlertTriangle } from "lucide-react";
import { TERMS_DOC, PRIVACY_DOC, legalPendingItems, type LegalDoc } from "@/lib/legal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogPortal } from "@/components/ui/dialog";

export function LegalConsentStep({
  accepted, onAcceptedChange, termsViewed, privacyViewed, onViewed, draft, testEnv,
}: {
  accepted: boolean; onAcceptedChange: (v: boolean) => void;
  termsViewed: boolean; privacyViewed: boolean;
  onViewed: (doc: "terms" | "privacy") => void;
  draft: boolean; testEnv: boolean;
}) {
  const [open, setOpen] = useState<"terms" | "privacy" | null>(null);
  const readerTrigger = useRef<HTMLButtonElement | null>(null);
  const cards = [
    { key: "terms" as const, doc: TERMS_DOC, icon: FileText, viewed: termsViewed,
      desc: "Regras para usar o Futquick, participar e organizar peladas, conduta, denúncias e responsabilidades." },
    { key: "privacy" as const, doc: PRIVACY_DOC, icon: ShieldCheck, viewed: privacyViewed,
      desc: "Dados coletados, localização, perfil, notificações, fornecedores, retenção e seus direitos na LGPD." },
  ];
  return (
    <div className="legal-documents animate-slide-up text-foreground">
      <h1 className="font-display font-extrabold italic text-3xl text-foreground leading-tight mb-2">Antes de entrar em campo</h1>
      <p className="text-muted-foreground text-sm mb-5">Conheça as regras da comunidade e como cuidamos dos seus dados.</p>
      {draft && (
        <div className="mb-4 rounded-2xl border border-destructive/40 bg-background p-3 flex gap-2 text-xs text-foreground">
          <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
          <span>
            <b>RASCUNHO / EM REVISÃO.</b> Os documentos ainda têm dados pendentes dos responsáveis.{" "}
            {testEnv ? "Conclusão liberada só para testes nesta prévia." : "Por isso, a conclusão de novos cadastros está temporariamente pausada no app oficial. Seus dados preenchidos não serão perdidos."}
            <span className="block mt-1.5 text-muted-foreground">Falta definir:</span>
            <ul className="list-disc pl-4 text-muted-foreground">
              {legalPendingItems().map((i) => <li key={i}>{i}</li>)}
            </ul>
          </span>
        </div>
      )}
      <div className="space-y-3">
        {cards.map(({ key, doc, icon: Icon, viewed, desc }) => (
          <Button key={key} type="button" variant="outline" onClick={(event) => { readerTrigger.current = event.currentTarget; setOpen(key); onViewed(key); }}
            className="w-full h-auto whitespace-normal text-left rounded-2xl bg-card text-card-foreground border-border p-4 flex gap-3 items-center hover:bg-muted hover:text-foreground active:scale-[0.98] transition-transform">
            <div className="size-11 rounded-xl bg-muted grid place-items-center shrink-0"><Icon className="size-5 text-primary" /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold italic text-card-foreground">{doc.title}</span>
                {viewed && <Check className="size-4 shrink-0 text-primary" strokeWidth={3} aria-label="Lido" />}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              <span className="text-[10px] text-muted-foreground uppercase">Versão {doc.version}{draft ? " · rascunho" : ""}</span>
            </div>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
          </Button>
        ))}
      </div>
      <label className="mt-5 flex gap-3 items-start rounded-2xl border border-border bg-background p-4 cursor-pointer">
        <input type="checkbox" checked={accepted} onChange={(e) => onAcceptedChange(e.target.checked)}
          className="mt-0.5 size-5 accent-primary shrink-0" />
        <span className="text-sm text-foreground">Li e concordo com os Termos de Uso e declaro que tive acesso à Política de Privacidade.</span>
      </label>
      {(!termsViewed || !privacyViewed) && (
        <p className="mt-3 text-xs text-muted-foreground text-center">Abra os dois documentos para liberar a conclusão.</p>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground text-center">Ao concluir, registramos as versões aceitas e a data e hora do servidor.</p>
      {open && <LegalReader doc={open === "terms" ? TERMS_DOC : PRIVACY_DOC} draft={draft} onClose={() => setOpen(null)} onReturnFocus={() => readerTrigger.current?.focus()} />}
    </div>
  );
}

function LegalReader({ doc, draft, onClose, onReturnFocus }: { doc: LegalDoc; draft: boolean; onClose: () => void; onReturnFocus: () => void }) {
  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogPortal>
      <DialogPrimitive.Content className="legal-documents legal-reader fixed inset-0 z-50 flex flex-col bg-background text-foreground" onCloseAutoFocus={(event) => { event.preventDefault(); onReturnFocus(); }}>
      <header className="legal-reader-header px-5 pb-3 border-b border-border grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 shrink-0">
        <Button type="button" variant="outline" size="icon" onClick={onClose} aria-label="Voltar" className="min-h-11 min-w-11 rounded-full bg-card text-card-foreground border-border hover:bg-muted hover:text-foreground">
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0">
          <DialogPrimitive.Title className="font-display font-extrabold italic text-xl text-foreground">{doc.title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-[11px] text-muted-foreground">Versão {doc.version}{draft ? " · RASCUNHO / EM REVISÃO" : ""}</DialogPrimitive.Description>
        </div>
      </header>
      <div className="legal-reader-body min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-5" tabIndex={0}>
        {doc.sections.map((s) => (
          <section key={s.title}>
            <h3 className="font-display font-bold text-primary text-base mb-1.5">{s.title}</h3>
            {s.body.map((p, i) => <p key={i} className="text-sm text-foreground leading-relaxed mb-2">{p}</p>)}
          </section>
        ))}
      </div>
      <footer className="legal-reader-footer p-5 border-t border-border bg-background shrink-0">
        <Button type="button" onClick={onClose} className="w-full min-h-12 h-auto whitespace-normal py-4 rounded-2xl font-display font-extrabold italic uppercase">Voltar ao cadastro</Button>
      </footer>
      </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
