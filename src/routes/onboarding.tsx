import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Zap } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: OnboardingPage,
});

const POSITIONS = ["Goleiro", "Zagueiro", "Lateral", "Volante", "Meia", "Atacante"];

function OnboardingPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: (user.user_metadata as any)?.name ?? "",
    age: "",
    city: "",
    bio: "",
    favorite_position: "",
  });

  const canNext = step === 1 ? form.name.length >= 2 : step === 2 ? !!form.city : true;
  const totalSteps = 3;

  const submit = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        name: form.name.trim(),
        age: form.age ? parseInt(form.age, 10) : null,
        city: form.city.trim(),
        bio: form.bio.trim() || null,
        favorite_position: form.favorite_position || null,
        onboarding_complete: true,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/descobrir" });
  };

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <header className="pt-12 px-6 pb-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="size-9 rounded-xl bg-cyan grid place-items-center">
            <Zap className="size-4 text-navy" strokeWidth={3} />
          </div>
          <span className="font-display font-extrabold italic text-lg text-white">FUTQUICK</span>
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? "bg-cyan" : "bg-white/10"}`} />
          ))}
        </div>
      </header>

      <main className="flex-1 px-6">
        {step === 1 && (
          <div className="animate-slide-up">
            <h1 className="font-display font-extrabold italic uppercase text-3xl text-white leading-tight mb-2">
              Como te chamamos<br />em campo?
            </h1>
            <p className="text-white/60 text-sm mb-8">Seu nome vai aparecer nas peladas.</p>
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Seu nome"
              className="w-full text-2xl font-bold bg-transparent border-b-2 border-white/10 py-2 focus:border-cyan outline-none text-white placeholder:text-white/20"
            />
            <div className="mt-6 space-y-2">
              <label className="text-mono-label">Idade (opcional)</label>
              <input
                type="number"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                placeholder="Ex: 27"
                className="w-full text-xl font-bold bg-transparent border-b-2 border-white/10 py-2 focus:border-cyan outline-none text-white placeholder:text-white/20"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-slide-up">
            <h1 className="font-display font-extrabold italic uppercase text-3xl text-white leading-tight mb-2">
              De onde<br />você joga?
            </h1>
            <p className="text-white/60 text-sm mb-8">Vamos mostrar peladas perto de você.</p>
            <input
              autoFocus
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Sua cidade"
              className="w-full text-2xl font-bold bg-transparent border-b-2 border-white/10 py-2 focus:border-cyan outline-none text-white placeholder:text-white/20"
            />
          </div>
        )}

        {step === 3 && (
          <div className="animate-slide-up">
            <h1 className="font-display font-extrabold italic uppercase text-3xl text-white leading-tight mb-2">
              Qual sua<br />posição?
            </h1>
            <p className="text-white/60 text-sm mb-8">Isso fica com a gente — não aparece no perfil.</p>
            <div className="grid grid-cols-2 gap-2">
              {POSITIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => setForm({ ...form, favorite_position: p })}
                  className={`py-4 rounded-2xl border font-bold uppercase text-sm ${
                    form.favorite_position === p
                      ? "bg-cyan text-navy border-cyan"
                      : "border-white/10 text-white/70"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="mt-6 space-y-2">
              <label className="text-mono-label">Bio (opcional)</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={2}
                placeholder="Uma linha sobre você em campo..."
                className="w-full p-3 rounded-2xl bg-navy-soft border border-white/10 text-white focus:border-cyan outline-none resize-none placeholder:text-white/30"
              />
            </div>
          </div>
        )}
      </main>

      <footer className="p-6 flex gap-3">
        {step > 1 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="px-6 py-4 bg-navy-soft border border-white/10 text-white rounded-2xl font-bold uppercase text-xs"
          >
            Voltar
          </button>
        )}
        <button
          disabled={!canNext || saving}
          onClick={() => (step === totalSteps ? submit() : setStep((s) => s + 1))}
          className="flex-1 py-4 bg-cyan text-navy rounded-2xl font-display font-extrabold italic uppercase disabled:opacity-30 active:scale-95 transition-transform"
        >
          {saving ? "..." : step === totalSteps ? "Bora jogar" : "Próximo"}
        </button>
      </footer>
    </div>
  );
}
