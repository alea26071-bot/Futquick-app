import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { uploadUserPhoto } from "@/lib/storage-helpers";
import { ArrowLeft, ArrowRight, Camera, User as UserIcon, Calendar, MapPin, Star, Image as ImageIcon } from "lucide-react";

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
const TOTAL_STEPS = 5;

function OnboardingPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: (user.user_metadata as any)?.name ?? "",
    age: "",
    city: "",
    favorite_position: "",
  });

  const canNext =
    step === 1 ? form.name.trim().length >= 2 :
    step === 2 ? !!form.age && Number(form.age) >= 8 && Number(form.age) <= 90 :
    step === 3 ? form.city.trim().length >= 2 :
    step === 4 ? true : // position optional
    true; // photo optional

  const pickAvatar = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const url = await uploadUserPhoto("avatars", user.id, file, "avatar");
      setAvatarUrl(url);
      toast.success("Foto carregada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar foto");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const finish = async () => {
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        name: form.name.trim(),
        age: form.age ? parseInt(form.age, 10) : null,
        city: form.city.trim() || null,
        favorite_position: form.favorite_position || null,
        onboarding_complete: true,
      };
      if (avatarUrl) payload.avatar_url = avatarUrl;
      const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
      if (error) throw error;
      navigate({ to: "/descobrir" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
    else finish();
  };

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <header className="pt-12 px-6 pb-4">
        <div className="flex flex-col items-center gap-2 mb-4">
          <Logo className="size-12 rounded-2xl" />
          <span className="font-display font-extrabold italic text-lg text-white">Futquick</span>
        </div>
        <p className="text-center text-white/60 text-xs mb-4">
          Rápido e fácil · leva menos de 1 minuto
        </p>
        <div className="flex items-center gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="size-8 rounded-full bg-navy-soft border border-white/10 grid place-items-center"
              aria-label="Voltar"
            >
              <ArrowLeft className="size-4 text-white" />
            </button>
          )}
          <div className="flex-1 flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full ${step > i ? "bg-cyan" : "bg-white/10"}`} />
            ))}
          </div>
          <span className="text-mono-label text-white/50">{step}/{TOTAL_STEPS}</span>
        </div>
      </header>

      <main className="flex-1 px-6 pt-6">
        {step === 1 && (
          <StepContainer icon={<UserIcon className="size-6 text-cyan" />} title="Como você se chama?" hint="Seu nome será visível para outros jogadores.">
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Seu nome completo"
              className="w-full text-xl font-bold bg-navy-soft rounded-2xl border-2 border-cyan/40 py-4 px-4 focus:border-cyan outline-none text-white placeholder:text-white/30"
            />
          </StepContainer>
        )}

        {step === 2 && (
          <StepContainer icon={<Calendar className="size-6 text-cyan" />} title="Qual sua idade?" hint="Precisamos saber para organizar peladas adequadas.">
            <input
              autoFocus
              type="number"
              inputMode="numeric"
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
              placeholder="Ex: 25"
              className="w-full text-xl font-bold bg-navy-soft rounded-2xl border-2 border-cyan/40 py-4 px-4 focus:border-cyan outline-none text-white placeholder:text-white/30"
            />
          </StepContainer>
        )}

        {step === 3 && (
          <StepContainer icon={<MapPin className="size-6 text-cyan" />} title="Qual sua cidade?" hint="Encontraremos peladas perto de você.">
            <input
              autoFocus
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Ex: Natal, RN"
              className="w-full text-xl font-bold bg-navy-soft rounded-2xl border-2 border-cyan/40 py-4 px-4 focus:border-cyan outline-none text-white placeholder:text-white/30"
            />
          </StepContainer>
        )}

        {step === 4 && (
          <StepContainer icon={<Star className="size-6 text-cyan" />} title="Qual sua posição?" hint="Opcional — não aparecerá no seu perfil público.">
            <div className="grid grid-cols-2 gap-2">
              {POSITIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => setForm({ ...form, favorite_position: form.favorite_position === p ? "" : p })}
                  className={`py-4 rounded-2xl border-2 font-bold uppercase text-sm ${
                    form.favorite_position === p
                      ? "bg-cyan text-navy border-cyan"
                      : "border-white/10 text-white/70 bg-navy-soft"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep((s) => s + 1)}
              className="mt-4 w-full text-center text-white/50 text-sm underline underline-offset-4"
            >
              Pular esta etapa
            </button>
          </StepContainer>
        )}

        {step === 5 && (
          <StepContainer icon={<ImageIcon className="size-6 text-cyan" />} title="Foto de perfil" hint="Adicione uma foto para que outros jogadores te reconheçam.">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickAvatar(f);
                e.currentTarget.value = "";
              }}
            />
            <div className="flex flex-col items-center gap-4 py-6">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                className="relative size-40 rounded-full bg-navy-soft border-2 border-cyan/40 grid place-items-center overflow-hidden"
                aria-label="Escolher foto"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Sua foto" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="size-16 text-white/30" strokeWidth={1.5} />
                )}
                <div className="absolute bottom-2 right-2 size-11 rounded-full bg-cyan grid place-items-center border-4 border-navy">
                  {uploadingAvatar ? (
                    <div className="size-4 rounded-full border-2 border-navy border-t-transparent animate-spin" />
                  ) : (
                    <Camera className="size-5 text-navy" strokeWidth={2.5} />
                  )}
                </div>
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                className="text-cyan text-sm font-bold uppercase tracking-wide"
              >
                {avatarUrl ? "Trocar foto" : "Escolher foto"}
              </button>
              {!avatarUrl && (
                <p className="text-xs text-white/40 text-center">Você pode adicionar depois no seu perfil.</p>
              )}
            </div>
          </StepContainer>
        )}
      </main>

      <footer className="p-6">
        <button
          disabled={!canNext || saving || uploadingAvatar}
          onClick={next}
          className="w-full py-4 bg-cyan text-navy rounded-2xl font-display font-extrabold italic uppercase disabled:opacity-30 active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          {saving ? "..." : step === TOTAL_STEPS ? "Bora jogar" : "Continuar"}
          {!saving && step < TOTAL_STEPS && <ArrowRight className="size-5" strokeWidth={3} />}
        </button>
      </footer>
    </div>
  );
}

function StepContainer({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-slide-up">
      <div className="flex items-center gap-3 mb-2">
        <div className="size-12 rounded-2xl bg-cyan/10 border border-cyan/20 grid place-items-center flex-none">
          {icon}
        </div>
        <h1 className="font-display font-extrabold italic uppercase text-2xl text-white leading-tight">
          {title}
        </h1>
      </div>
      <p className="text-white/60 text-sm mb-6 ml-15 pl-15" style={{ paddingLeft: "60px" }}>
        {hint}
      </p>
      {children}
    </div>
  );
}
