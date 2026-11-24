import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, FileText, ShieldCheck, Check, AlertTriangle } from "lucide-react";
import { TERMS_DOC, PRIVACY_DOC, legalPendingItems, type LegalDoc } from "@/lib/legal";

export function LegalConsentStep({
  accepted, onAcceptedChange, termsViewed, privacyViewed, onViewed, draft, testEnv,
}: {
  accepted: boolean; onAcceptedChange: (v: boolean) => void;
  termsViewed: boolean; privacyViewed: boolean;
  onViewed: (doc: "terms" | "privacy") => void;
  draft: boolean; testEnv: boolean;
}) {
  const [open, setOpen] = useState<"terms" | "privacy" | null>(null);
  const cards = [
    { key: "terms" as const, doc: TERMS_DOC, icon: FileText, viewed: termsViewed,
      desc: "Regras para usar o Futquick, participar e organizar peladas, conduta, denúncias e responsabilidades." },
    { key: "privacy" as const, doc: PRIVACY_DOC, icon: ShieldCheck, viewed: privacyViewed,
      desc: "Dados coletados, localização, perfil, notificações, fornecedores, retenção e seus direitos na LGPD." },
  ];
  return (
    <div className="animate-slide-up">
      <h1 className="font-display font-extrabold italic text-3xl text-white leading-tight mb-2">Antes de entrar em campo</h1>
      <p className="text-white/60 text-sm mb-5">Conheça as regras da comunidade e como cuidamos dos seus dados.</p>
      {draft && (
        <div className="mb-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 flex gap-2 text-xs text-white/80">
          <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
          <span>
            <b>RASCUNHO / EM REVISÃO.</b> Os documentos ainda têm dados pendentes dos responsáveis.{" "}
            {testEnv ? "Conclusão liberada só para testes nesta prévia." : "Por isso, a conclusão de novos cadastros está temporariamente pausada no app oficial. Seus dados preenchidos não serão perdidos."}
            <span className="block mt-1.5 text-white/60">Falta definir:</span>
            <ul className="list-disc pl-4 text-white/60">
              {legalPendingItems().map((i) => <li key={i}>{i}</li>)}
            </ul>
          </span>
        </div>
      )}
      <div className="space-y-3">
        {cards.map(({ key, doc, icon: Icon, viewed, desc }) => (
          <button key={key} type="button" onClick={() => { setOpen(key); onViewed(key); }}
            className="w-full text-left rounded-2xl bg-navy-soft border border-white/10 p-4 flex gap-3 items-center active:scale-[0.98] transition-transform">
            <div className="size-11 rounded-xl bg-cyan/15 grid place-items-center shrink-0"><Icon className="size-5 text-cyan" /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold italic text-white">{doc.title}</span>
                {viewed && <Check className="size-4 text-cyan" strokeWidth={3} aria-label="Lido" />}
              </div>
              <p className="text-xs text-white/55 mt-0.5">{desc}</p>
              <span className="text-[10px] text-white/35 uppercase tracking-wide">Versão {doc.version}{draft ? " · rascunho" : ""}</span>
            </div>
            <ChevronRight className="size-5 text-white/40" />
          </button>
        ))}
      </div>
      <label className="mt-5 flex gap-3 items-start rounded-2xl border border-white/10 p-4 cursor-pointer">
        <input type="checkbox" checked={accepted} onChange={(e) => onAcceptedChange(e.target.checked)}
          className="mt-0.5 size-5 accent-cyan shrink-0" />
        <span className="text-sm text-white/85">Li e concordo com os Termos de Uso e declaro que tive acesso à Política de Privacidade.</span>
      </label>
      {(!termsViewed || !privacyViewed) && (
        <p className="mt-3 text-xs text-white/45 text-center">Abra os dois documentos para liberar a conclusão.</p>
      )}
      <p className="mt-3 text-[11px] text-white/40 text-center">Ao concluir, registramos as versões aceitas e a data e hora do servidor.</p>
      {open && <LegalReader doc={open === "terms" ? TERMS_DOC : PRIVACY_DOC} draft={draft} onClose={() => setOpen(null)} />}
    </div>
  );
}

function LegalReader({ doc, draft, onClose }: { doc: LegalDoc; draft: boolean; onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div className="fixed inset-0 z-50 bg-navy flex flex-col" role="dialog" aria-modal="true" aria-label={doc.title}>
      <header className="pt-10 px-5 pb-3 border-b border-white/10 flex items-center gap-3">
        <button onClick={onClose} aria-label="Voltar" className="size-9 rounded-full bg-navy-soft border border-white/10 grid place-items-center">
          <ArrowLeft className="size-4 text-white" />
        </button>
        <div className="flex-1">
          <h2 className="font-display font-extrabold italic text-xl text-white">{doc.title}</h2>
          <p className="text-[11px] text-white/45">Versão {doc.version}{draft ? " · RASCUNHO / EM REVISÃO" : ""}</p>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {doc.sections.map((s) => (
          <section key={s.title}>
            <h3 className="font-display font-bold text-cyan text-base mb-1.5">{s.title}</h3>
            {s.body.map((p, i) => <p key={i} className="text-sm text-white/75 leading-relaxed mb-2">{p}</p>)}
          </section>
        ))}
      </div>
      <footer className="p-5 border-t border-white/10">
        <button onClick={onClose} className="w-full py-4 bg-cyan text-navy rounded-2xl font-display font-extrabold italic uppercase">Voltar ao cadastro</button>
      </footer>
    </div>
  );
}
