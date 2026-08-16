import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Logo } from "@/components/Logo";
import { StateCityPicker } from "@/components/StateCityPicker";
import { uploadUserPhoto } from "@/lib/storage-helpers";
import {
  maskPhoneBR,
  validatePhoneBR,

  validateSecretForPhone,
  isAdminPhone,
  ADMIN_SECRET,
  phoneToSyntheticEmail,
  onlyDigits,
} from "@/lib/phone-utils";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  User as UserIcon,
  Phone,
  Calendar,
  MapPin,
  Navigation,
  LocateFixed,
  Image as ImageIcon,
  Lock,
} from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

const TOTAL_STEPS = 7;

const RADIUS_OPTIONS: Array<{ label: string; hint: string; value: number | null }> = [
  { label: "2 km", hint: "Só o que está no seu bairro", value: 2 },
  { label: "5 km", hint: "Sua região e vizinhança", value: 5 },
  { label: "10 km", hint: "Boa parte da sua cidade", value: 10 },
  { label: "Qualquer distância", hint: "Receber todas as peladas", value: null },
];


type Mode = "signup" | "login";

function AuthPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("signup");
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [form, setForm] = useState<{
    name: string;
    phone: string;
    pin: string;
    pinConfirm: string;
    age: string;
    city: string;
    state: string;
    radius: number | null;
  }>({
    name: "",
    phone: "",
    pin: "",
    pinConfirm: "",
    age: "",
    city: "",
    state: "",
    radius: 5,
  });
  const [radiusTouched, setRadiusTouched] = useState(false);

  // Login-mode state
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/descobrir" });
    });
  }, [navigate]);

  const phoneCheck = validatePhoneBR(form.phone);
  const adminMode = isAdminPhone(form.phone);
  const loginAdminMode = isAdminPhone(loginPhone);

  const canNext =
    step === 1 ? form.name.trim().length >= 2 :
    step === 2 ? phoneCheck.ok :
    step === 3 ? validateSecretForPhone(form.phone, form.pin) && form.pin === form.pinConfirm :
    step === 4 ? !!form.age && Number(form.age) >= 8 && Number(form.age) <= 90 :
    step === 5 ? !!form.state && form.city.trim().length >= 2 :
    step === 6 ? radiusTouched || form.radius !== null :
    true;


  // Create the account (auth + profile.phone) at end of step 3.
  const createAccount = async (): Promise<boolean> => {
    if (!phoneCheck.ok) {
      setPhoneError(phoneCheck.error ?? "Telefone inválido");
      setStep(2);
      return false;
    }
    if (!validateSecretForPhone(form.phone, form.pin) || form.pin !== form.pinConfirm) {
      setPinError(adminMode ? "Chave de administrador inválida" : "PIN inválido");
      return false;
    }
    const email = phoneToSyntheticEmail(phoneCheck.digits);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: form.pin,
      options: { data: { name: form.name.trim() } },
    });
    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        setPhoneError("Já existe uma conta com este telefone. Faça login.");
        setStep(2);
      } else {
        toast.error(error.message);
      }
      return false;
    }
    if (!data.user) {
      toast.error("Não foi possível criar a conta");
      return false;
    }
    // Persist phone digits + name early so DB unique index catches conflicts now.
    const { error: upErr } = await supabase
      .from("profiles")
      .update({ name: form.name.trim(), phone: phoneCheck.digits })
      .eq("id", data.user.id);
    if (upErr) {
      const m = upErr.message?.toLowerCase() ?? "";
      if (m.includes("duplicate") || m.includes("unique")) {
        setPhoneError("Já existe uma conta com este telefone. Faça login.");
        await supabase.auth.signOut();
        setStep(2);
        return false;
      }
      toast.error(upErr.message);
      return false;
    }
    return true;
  };

  const pickAvatar = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
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

  const askLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Seu dispositivo não suporta localização.");
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
      },
      () => {
        setGeoError("Não conseguimos sua localização. Você pode continuar sem ela.");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const finish = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sessão não iniciada");

      const { error } = await supabase
        .from("profiles")
        .update({
          name: form.name.trim(),
          age: form.age ? parseInt(form.age, 10) : null,
          city: form.city.trim() || null,
          state: form.state || null,
          notify_radius_km: form.radius,
          onboarding_complete: true,
          ...(coords
            ? {
                latitude: coords.lat,
                longitude: coords.lng,
                location_updated_at: new Date().toISOString(),
              }
            : {}),
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


  const next = async () => {
    if (!canNext) return;
    if (step === 2) {
      const check = validatePhoneBR(form.phone);
      if (!check.ok) {
        setPhoneError(check.error ?? "Telefone inválido");
        return;
      }
      setPhoneError(null);
      setStep(3);
      return;
    }
    if (step === 3) {
      if (form.pin !== form.pinConfirm) {
        setPinError(adminMode ? "As chaves não conferem" : "Os PINs não conferem");
        return;
      }
      setPinError(null);
      setSaving(true);
      const ok = await createAccount();
      setSaving(false);
      if (ok) setStep(4);
      return;
    }
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

  const handlePhoneLogin = async () => {
    const check = validatePhoneBR(loginPhone);
    if (!check.ok) {
      setLoginError(check.error ?? "Telefone inválido");
      return;
    }
    if (!validateSecretForPhone(loginPhone, loginPin)) {
      setLoginError(loginAdminMode ? "Chave de administrador inválida" : "PIN deve ter 6 dígitos");
      return;
    }
    setLoginError(null);
    setLoginLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: phoneToSyntheticEmail(check.digits),
        password: loginPin,
      });
      if (error) {
        const msg = error.message?.toLowerCase() ?? "";
        if (msg.includes("invalid") || msg.includes("credential")) {
          setLoginError("Telefone ou PIN incorretos");
        } else {
          setLoginError(error.message);
        }
        return;
      }
      navigate({ to: "/descobrir" });
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : "Erro ao entrar");
    } finally {
      setLoginLoading(false);
    }
  };

  if (mode === "login") {
    return (
      <div className="min-h-screen bg-navy flex flex-col">
        <header className="pt-12 px-6 pb-4">
          <div className="flex flex-col items-center gap-2 mb-4">
            <Logo className="size-12 rounded-2xl" />
            <span className="font-display font-extrabold italic text-lg text-white">Futquick</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setMode("signup"); setLoginError(null); }}
              className="size-8 rounded-full bg-navy-soft border border-white/10 grid place-items-center"
              aria-label="Voltar"
            >
              <ArrowLeft className="size-4 text-white" />
            </button>
            <span className="text-white/60 text-sm">Entrar com telefone</span>
          </div>
        </header>

        <main className="flex-1 px-6 pt-6 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-12 rounded-2xl bg-cyan/10 border border-cyan/20 grid place-items-center flex-none">
              <Phone className="size-6 text-cyan" />
            </div>
            <h1 className="font-display font-extrabold italic uppercase text-2xl text-white leading-tight">
              Já tenho conta
            </h1>
          </div>

          <div className="space-y-2">
            <label className="text-white/60 text-xs uppercase tracking-wide">Telefone</label>
            <input
              autoFocus
              type="tel"
              inputMode="numeric"
              value={maskPhoneBR(loginPhone)}
              onChange={(e) => setLoginPhone(onlyDigits(e.target.value))}
              placeholder="(00) 00000-0000"
              className="w-full text-xl font-bold bg-navy-soft rounded-2xl border-2 border-cyan/40 py-4 px-4 focus:border-cyan outline-none text-white placeholder:text-white/30"
            />
          </div>

          <div className="space-y-2">
            <label className="text-white/60 text-xs uppercase tracking-wide">
              {loginAdminMode ? "Chave de administrador" : "PIN de 6 dígitos"}
            </label>
            <input
              type="password"
              autoComplete="current-password"
              {...(loginAdminMode ? {} : { inputMode: "numeric" as const, maxLength: 6 })}
              value={loginPin}
              onChange={(e) =>
                setLoginPin(
                  loginAdminMode ? e.target.value : onlyDigits(e.target.value).slice(0, 6),
                )
              }
              placeholder={loginAdminMode ? "Digite sua chave" : "••••••"}
              className="w-full text-xl font-bold tracking-widest bg-navy-soft rounded-2xl border-2 border-cyan/40 py-4 px-4 focus:border-cyan outline-none text-white placeholder:text-white/30"
            />
          </div>

          {loginError && (
            <p className="text-red-400 text-sm">{loginError}</p>
          )}

          <button
            className="text-white/50 text-xs underline underline-offset-4"
            onClick={() => toast.info("Recuperação por SMS em breve. Contate o suporte.")}
          >
            Esqueci meu PIN
          </button>
        </main>

        <footer className="p-6 space-y-3">
          <button
            disabled={loginLoading}
            onClick={handlePhoneLogin}
            className="w-full py-4 bg-cyan text-navy rounded-2xl font-display font-extrabold italic uppercase disabled:opacity-30 active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            {loginLoading ? "..." : "Entrar"}
          </button>
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full py-3 text-white/60 text-sm underline underline-offset-4 disabled:opacity-50"
          >
            Entrar com Google
          </button>
        </footer>
      </div>
    );
  }

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
          <Step icon={<Phone className="size-6 text-cyan" />} title="Qual seu telefone?" hint="Será seu identificador para entrar no app.">
            <input
              autoFocus
              type="tel"
              inputMode="numeric"
              value={maskPhoneBR(form.phone)}
              onChange={(e) => {
                setPhoneError(null);
                setForm({ ...form, phone: onlyDigits(e.target.value) });
              }}
              placeholder="(00) 00000-0000"
              className="w-full text-xl font-bold bg-navy-soft rounded-2xl border-2 border-cyan/40 py-4 px-4 focus:border-cyan outline-none text-white placeholder:text-white/30"
            />
            {phoneError && <p className="text-red-400 text-sm mt-3">{phoneError}</p>}
          </Step>
        )}

        {step === 3 && (
          <Step
            icon={<Lock className="size-6 text-cyan" />}
            title={adminMode ? "Crie sua chave de acesso" : "Crie um PIN"}
            hint={
              adminMode
                ? `Conta de desenvolvedor: use a chave ${ADMIN_SECRET}`
                : "6 dígitos. Use para entrar na sua conta no futuro."
            }
          >
            <div className="space-y-3">
              <input
                autoFocus
                type="password"
                autoComplete="new-password"
                {...(adminMode ? {} : { inputMode: "numeric" as const, maxLength: 6 })}
                value={form.pin}
                onChange={(e) => {
                  setPinError(null);
                  const v = adminMode ? e.target.value : onlyDigits(e.target.value).slice(0, 6);
                  setForm({ ...form, pin: v });
                }}
                placeholder={adminMode ? "Sua chave" : "••••••"}
                className="w-full text-xl font-bold tracking-widest bg-navy-soft rounded-2xl border-2 border-cyan/40 py-4 px-4 focus:border-cyan outline-none text-white placeholder:text-white/30"
              />
              <input
                type="password"
                autoComplete="new-password"
                {...(adminMode ? {} : { inputMode: "numeric" as const, maxLength: 6 })}
                value={form.pinConfirm}
                onChange={(e) => {
                  setPinError(null);
                  const v = adminMode ? e.target.value : onlyDigits(e.target.value).slice(0, 6);
                  setForm({ ...form, pinConfirm: v });
                }}
                placeholder={adminMode ? "Confirme sua chave" : "Confirme seu PIN"}
                className="w-full text-xl font-bold tracking-widest bg-navy-soft rounded-2xl border-2 border-cyan/40 py-4 px-4 focus:border-cyan outline-none text-white placeholder:text-white/30"
              />
              {pinError && <p className="text-red-400 text-sm">{pinError}</p>}
            </div>
          </Step>
        )}

        {step === 4 && (
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

        {step === 5 && (
          <Step icon={<MapPin className="size-6 text-cyan" />} title="Qual sua região?" hint="Escolha seu estado e cidade — mostramos as opções enquanto você digita.">
            <StateCityPicker
              state={form.state}
              city={form.city}
              onChange={({ state, city }) => setForm({ ...form, state, city })}
            />
          </Step>
        )}

        {step === 6 && (
          <Step icon={<Navigation className="size-6 text-cyan" />} title="Peladas perto de você" hint="Permita a localização e escolha o raio de notificação.">
            <div className="space-y-5">
              <button
                onClick={askLocation}
                disabled={geoLoading}
                className={`w-full py-4 rounded-2xl font-bold uppercase text-sm flex items-center justify-center gap-2 border-2 ${
                  coords ? "border-cyan/40 bg-cyan/10 text-cyan" : "border-cyan/40 bg-navy-soft text-white"
                }`}
              >
                <LocateFixed className="size-5" />
                {geoLoading ? "Localizando..." : coords ? "Localização confirmada" : "Permitir localização"}
              </button>
              {geoError && <p className="text-red-400 text-xs">{geoError}</p>}

              <div>
                <p className="text-white/60 text-xs uppercase tracking-wide mb-4">
                  Raio de notificação
                </p>
                <div className="relative pl-1">
                  <div className="absolute left-[13px] top-2 bottom-2 w-0.5 bg-white/10" />
                  <div className="space-y-2">
                    {RADIUS_OPTIONS.map((opt) => {
                      const active = form.radius === opt.value;
                      return (
                        <button
                          key={opt.label}
                          onClick={() => {
                            setRadiusTouched(true);
                            setForm({ ...form, radius: opt.value });
                          }}

                          className="w-full flex items-center gap-3 py-2 text-left"
                        >
                          <span
                            className={`relative z-10 size-6 rounded-full grid place-items-center border-2 flex-none ${
                              active ? "bg-cyan border-cyan" : "bg-navy border-white/20"
                            }`}
                          >
                            {active && <Check className="size-3.5 text-navy" strokeWidth={4} />}
                          </span>
                          <span className="flex-1">
                            <span
                              className={`block font-display font-extrabold italic uppercase ${
                                active ? "text-cyan" : "text-white"
                              }`}
                            >
                              {opt.label}
                            </span>
                            <span className="block text-xs text-white/50">{opt.hint}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </Step>
        )}

        {step === 7 && (

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
          <>
            <button
              onClick={() => { setMode("login"); setLoginError(null); }}
              className="w-full py-3 text-white text-sm font-bold underline underline-offset-4"
            >
              Já tenho conta · entrar com telefone
            </button>
            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full py-2 text-white/60 text-sm underline underline-offset-4 disabled:opacity-50"
            >
              Entrar com Google
            </button>
          </>
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
      <p className="text-white/60 text-sm mb-6" style={{ paddingLeft: "60px" }}>
        {hint}
      </p>
      {children}
    </div>
  );
}
