import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Logo } from "@/components/Logo";
import { uploadUserPhoto } from "@/lib/storage-helpers";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  User as UserIcon,
  Phone,
  Calendar,
  MapPin,
  Image as ImageIcon,
} from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

const TOTAL_STEPS = 5;

function AuthPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    age: "",
    city: "",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/descobrir" });
    });
  }, [navigate]);

  const canNext =
    step === 1 ? form.name.trim().length >= 2 :
    step === 2 ? form.phone.replace(/\D/g, "").length >= 10 :
    step === 3 ? !!form.age && Number(form.age) >= 8 && Number(form.age) <= 90 :
    step === 4 ? form.city.trim().length >= 2 :
    true;

  const pickAvatar = async (file: File) => {
    // Need a signed-in user to upload; sign in anonymously first if needed.
    setUploadingAvatar(true);
    try {
      let { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        const { data, error } = await supabase.auth.signInAnonymously({
          options: { data: { name: form.name.trim() } },
        });
        if (error) throw error;
        userData = { user: data.user };
      }
      if (!userData.user) throw new Error("Sessão não iniciada");
      const url = await uploadUserPhoto("avatars", userData.user.id, file, "avatar");
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
      let { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        const { data, error } = await supabase.auth.signInAnonymously({
          options: { data: { name: form.name.trim() } },
        });
        if (error) throw error;
        userData = { user: data.user };
      }
      if (!userData.user) throw new Error("Sessão não iniciada");

      const { error } = await supabase
        .from("profiles")
        .update({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          age: form.age ? parseInt(form.age, 10) : null,
          city: form.city.trim() || null,
          onboarding_complete: true,
          ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        })
        .eq("id", userData.user.id);
      if (error) throw error;
      toast.success("Bora jogar!");
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

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      navigate({ to: "/descobrir" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no login com Google");
      setGoogleLoading(false);
    }
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
          <Step icon={<UserIcon className="size-6 text-cyan" />} title="Como você se chama?" hint="Seu nome será visível para outros jogadores.">
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Seu nome completo"
              className="w-full text-xl font-bold bg-navy-soft rounded-2xl border-2 border-cyan/40 py-4 px-4 focus:border-cyan outline-none text-white placeholder:text-white/30"
            />
          </Step>
        )}

        {step === 2 && (
          <Step icon={<Phone className="size-6 text-cyan" />} title="Qual seu telefone?" hint="Usado apenas para organizadores entrarem em contato.">
            <input
              autoFocus
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(00) 00000-0000"
              className="w-full text-xl font-bold bg-navy-soft rounded-2xl border-2 border-cyan/40 py-4 px-4 focus:border-cyan outline-none text-white placeholder:text-white/30"
            />
          </Step>
        )}

        {step === 3 && (
          <Step icon={<Calendar className="size-6 text-cyan" />} title="Qual sua idade?" hint="Para organizarmos peladas adequadas ao seu perfil.">
            <input
              autoFocus
              type="number"
              inputMode="numeric"
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
              placeholder="Ex: 25"
              className="w-full text-xl font-bold bg-navy-soft rounded-2xl border-2 border-cyan/40 py-4 px-4 focus:border-cyan outline-none text-white placeholder:text-white/30"
            />
          </Step>
        )}

        {step === 4 && (
          <Step icon={<MapPin className="size-6 text-cyan" />} title="Qual sua região?" hint="Encontraremos peladas perto de você.">
            <input
              autoFocus
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Ex: Natal, RN"
              className="w-full text-xl font-bold bg-navy-soft rounded-2xl border-2 border-cyan/40 py-4 px-4 focus:border-cyan outline-none text-white placeholder:text-white/30"
            />
          </Step>
        )}

        {step === 5 && (
          <Step icon={<ImageIcon className="size-6 text-cyan" />} title="Foto de perfil" hint="Adicione uma foto para que outros jogadores te reconheçam.">
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
          </Step>
        )}
      </main>

      <footer className="p-6 space-y-3">
        <button
          disabled={!canNext || saving || uploadingAvatar}
          onClick={next}
          className="w-full py-4 bg-cyan text-navy rounded-2xl font-display font-extrabold italic uppercase disabled:opacity-30 active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          {saving ? "..." : step === TOTAL_STEPS ? "Bora jogar" : "Continuar"}
          {!saving && step < TOTAL_STEPS && <ArrowRight className="size-5" strokeWidth={3} />}
        </button>
        {step === 1 && (
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full py-3 text-white/60 text-sm underline underline-offset-4 disabled:opacity-50"
          >
            Já tenho conta · entrar com Google
          </button>
        )}
        <p className="text-center text-[10px] text-white/30">
          Ao continuar você concorda com nossos termos.
        </p>
      </footer>
    </div>
  );
}

function Step({
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
      <p className="text-white/60 text-sm mb-6 pl-15" style={{ paddingLeft: "60px" }}>
        {hint}
      </p>
      {children}
    </div>
  );
}
