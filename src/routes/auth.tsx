import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Zap } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/descobrir" });
    });
  }, [navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { name },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Bem-vindo ao Futquick.");
        navigate({ to: "/onboarding" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bora jogar!");
        navigate({ to: "/descobrir" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      navigate({ to: "/descobrir" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no login com Google");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col justify-end px-6 pt-16 pb-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 -left-20 size-72 bg-cyan rounded-full blur-3xl" />
          <div className="absolute bottom-40 -right-20 size-80 bg-cyan/50 rounded-full blur-3xl" />
        </div>
        <div className="relative">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="size-10 rounded-2xl bg-cyan grid place-items-center">
              <Zap className="size-5 text-navy" strokeWidth={3} />
            </div>
            <span className="font-display font-extrabold italic text-2xl tracking-tighter">FUTQUICK</span>
          </div>
          <h1 className="font-display font-extrabold italic uppercase text-5xl leading-[0.95] text-white text-balance">
            Encontre sua<br />
            <span className="text-cyan">próxima pelada.</span>
          </h1>
          <p className="mt-4 text-white/60 text-base max-w-sm">
            O jeito mais rápido do Brasil para completar um time ou entrar num racha perto de você.
          </p>
        </div>
      </div>

      {/* Auth form */}
      <div className="bg-navy-soft rounded-t-3xl px-6 pt-8 pb-10 border-t border-white/5">
        <div className="flex gap-1 mb-6 p-1 bg-navy rounded-full w-fit">
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
              mode === "signup" ? "bg-cyan text-navy" : "text-white/60"
            }`}
          >
            Criar conta
          </button>
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
              mode === "signin" ? "bg-cyan text-navy" : "text-white/60"
            }`}
          >
            Entrar
          </button>
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          {mode === "signup" && (
            <input
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-4 rounded-2xl bg-navy border border-white/10 text-white placeholder:text-white/30 focus:border-cyan focus:outline-none transition-colors"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-4 rounded-2xl bg-navy border border-white/10 text-white placeholder:text-white/30 focus:border-cyan focus:outline-none transition-colors"
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-4 rounded-2xl bg-navy border border-white/10 text-white placeholder:text-white/30 focus:border-cyan focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-cyan text-navy rounded-2xl font-display font-extrabold italic uppercase tracking-wide text-lg active:scale-95 transition-transform disabled:opacity-50"
          >
            {loading ? "..." : mode === "signup" ? "Bora jogar" : "Entrar"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/40 text-xs uppercase font-mono">ou</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full py-4 bg-white text-navy rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:opacity-50"
        >
          <svg className="size-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continuar com Google
        </button>

        <p className="text-center text-xs text-white/40 mt-6">
          Ao continuar você concorda com nossos termos.
        </p>
      </div>
    </div>
  );
}
