import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";
import {
  LogOut,
  Edit3,
  Check,
  Camera,
  Sun,
  Moon,
  Pin,
  Repeat,
  MapPin,
  ShieldCheck,
  BadgeCheck,
  CalendarDays,
  CircleUserRound,
  Star,
  ExternalLink,
} from "lucide-react";
import { uploadUserPhoto } from "@/lib/storage-helpers";
import { useTheme } from "@/lib/theme";
import { WEEKDAY_LABEL } from "@/lib/pelada-utils";
import { createNextFromTemplate, setTemplateActive } from "@/lib/pelada-templates.functions";
import { claimAdminAccess } from "@/lib/admin.functions";
import { ADMIN_PHONE_DIGITS } from "@/lib/phone-utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/perfil")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Meu perfil | Futquick" },
      { name: "description", content: "Gerencie seu perfil, suas peladas fixas e suas preferências no Futquick." },
      { property: "og:title", content: "Meu perfil | Futquick" },
      { property: "og:description", content: "Gerencie seu perfil, suas peladas fixas e suas preferências no Futquick." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PerfilPage,
});

const POSITIONS = ["Goleiro", "Zagueiro", "Lateral", "Volante", "Meia", "Atacante"];

function PerfilPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { theme, toggle } = useTheme();
  const [editing, setEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  const { data: myPeladas = [] } = useQuery({
    queryKey: ["my-peladas", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("peladas")
        .select("*")
        .eq("organizer_id", user.id)
        .order("starts_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["pelada-templates", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("pelada_templates")
        .select("*")
        .eq("organizer_id", user.id)
        .eq("active", true)
        .order("weekday", { ascending: true });
      return data ?? [];
    },
  });

  const { data: isAdmin = false } = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
  });

  const [devKey, setDevKey] = useState("");
  const [devBusy, setDevBusy] = useState(false);

  const unlockDev = async () => {
    setDevBusy(true);
    try {
      await claimAdminAccess({ data: { key: devKey } });
      toast.success("Modo desenvolvedor liberado");
      setDevKey("");
      await qc.invalidateQueries({ queryKey: ["is-admin", user.id] });
      navigate({ to: "/admin" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chave inválida");
    } finally {
      setDevBusy(false);
    }
  };

  const [busyTemplate, setBusyTemplate] = useState<string | null>(null);

  const repeatTemplate = async (templateId: string) => {
    setBusyTemplate(templateId);
    try {
      const res = await createNextFromTemplate({ data: { templateId } });
      toast.success(res.created ? "Próxima pelada criada!" : "A próxima pelada já existe.");
      qc.invalidateQueries({ queryKey: ["my-peladas", user.id] });
      navigate({ to: "/pelada/$peladaId", params: { peladaId: res.peladaId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar próxima pelada");
    } finally {
      setBusyTemplate(null);
    }
  };

  const deactivateTemplate = async (templateId: string) => {
    setBusyTemplate(templateId);
    try {
      await setTemplateActive({ data: { templateId, active: false } });
      toast.success("Pelada fixa desativada");
      qc.invalidateQueries({ queryKey: ["pelada-templates", user.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao desativar");
    } finally {
      setBusyTemplate(null);
    }
  };

  const [form, setForm] = useState({ name: "", bio: "", city: "", age: "", favorite_position: "" });
  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name ?? "",
        bio: profile.bio ?? "",
        city: profile.city ?? "",
        age: profile.age?.toString() ?? "",
        favorite_position: profile.favorite_position ?? "",
      });
    }
  }, [profile]);

  const save = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({
        name: form.name.trim(),
        bio: form.bio.trim() || null,
        city: form.city.trim() || null,
        age: form.age ? parseInt(form.age, 10) : null,
        favorite_position: form.favorite_position || null,
        onboarding_complete: true,
      })
      .eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
    setEditing(false);
    qc.invalidateQueries({ queryKey: ["profile", user.id] });
  };

  const onPickAvatar = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const url = await uploadUserPhoto("avatars", user.id, file, "avatar");
      const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      if (error) throw error;
      toast.success("Foto atualizada");
      qc.invalidateQueries({ queryKey: ["profile", user.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar foto");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (isLoading) return <div className="min-h-screen bg-background" />;

  const handle =
    profile?.username || (profile?.name || "jogador").toLowerCase().replace(/[^a-z0-9]/g, "");
  const memberSince = profile?.created_at ? new Date(profile.created_at).getFullYear() : null;

  return (
    <main className="min-h-screen bg-background pb-28 text-foreground">
      {/* Capa sincronizada com a foto de perfil */}
      <section className="relative h-[40vh] min-h-72 max-h-[420px] overflow-hidden rounded-b-[2rem] bg-secondary">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="h-full w-full object-cover object-center" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-secondary">
            <CircleUserRound className="size-28 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background" />

        <div className="absolute inset-x-0 top-0 flex items-center justify-end gap-2 px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <button
            onClick={toggle}
            aria-label="Alternar tema"
            className="grid size-11 place-items-center rounded-full bg-navy/60 text-white ring-1 ring-white/25 backdrop-blur-md transition-colors hover:bg-navy/80"
          >
            {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
          <button
            onClick={() => (editing ? save() : setEditing(true))}
            aria-label={editing ? "Salvar perfil" : "Editar perfil"}
            className="grid size-11 place-items-center rounded-full bg-navy/60 text-white ring-1 ring-white/25 backdrop-blur-md transition-colors hover:bg-navy/80"
          >
            {editing ? <Check className="size-5" /> : <Edit3 className="size-5" />}
          </button>
          <button
            onClick={signOut}
            aria-label="Sair da conta"
            className="grid size-11 place-items-center rounded-full bg-navy/60 text-white ring-1 ring-white/25 backdrop-blur-md transition-colors hover:bg-navy/80"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-20 max-w-lg px-5 text-center">
        <button
          onClick={() => fileRef.current?.click()}
          aria-label="Trocar foto de perfil"
          className="group relative mx-auto block size-28 overflow-hidden rounded-full border-4 border-background bg-secondary shadow-xl"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Sua foto de perfil" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center">
              <CircleUserRound className="size-12 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 grid place-items-center bg-navy/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="size-6 text-white" />
          </div>
          {uploadingAvatar && (
            <div className="absolute inset-0 grid place-items-center bg-navy/70">
              <div className="size-6 animate-spin rounded-full border-2 border-cyan border-t-transparent" />
            </div>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPickAvatar(f);
            e.currentTarget.value = "";
          }}
        />

        {editing ? (
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-4 w-full border-b border-border bg-transparent pb-1 text-center text-3xl font-extrabold text-foreground outline-none focus:border-primary"
          />
        ) : (
          <h1 className="mt-4 text-3xl font-extrabold">{profile?.name || "Sem nome"}</h1>
        )}
        <p className="mt-1 text-sm text-muted-foreground">@{handle}</p>

        {profile?.phone_verified && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-primary">
            <BadgeCheck className="size-5 fill-primary text-primary-foreground" /> Jogador verificado
          </p>
        )}
        {!editing && (profile?.city || profile?.state) && (
          <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5" /> {[profile?.city, profile?.state].filter(Boolean).join(", ")}
            {profile?.age ? ` · ${profile.age} anos` : ""}
          </p>
        )}

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat icon={<CircleUserRound />} value={profile?.peladas_played ?? 0} label="Peladas" tone="primary" />
          <Stat
            icon={<Star />}
            value={profile?.rating_avg ? Number(profile.rating_avg).toFixed(1) : "—"}
            label="Nível"
            tone="warning"
          />
          <Stat icon={<ShieldCheck />} value={`${profile?.postura_score ?? 100}%`} label="Postura" tone="success" />
        </div>

        {editing ? (
          <div className="mt-6 space-y-3 rounded-2xl border border-border bg-card p-5 text-left shadow-sm">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-mono-label">Cidade</label>
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
              <div className="w-24">
                <label className="text-mono-label">Idade</label>
                <input
                  type="number"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
            </div>
            <div>
              <label className="text-mono-label">Posição favorita</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {POSITIONS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setForm({ ...form, favorite_position: p })}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase ${
                      form.favorite_position === p
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-mono-label">Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={3}
                className="mt-1 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
            <Button onClick={save} className="w-full rounded-full font-bold">
              Salvar alterações
            </Button>
          </div>
        ) : (
          <article className="mt-6 rounded-2xl border border-border bg-card p-5 text-left shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <CircleUserRound className="size-5 text-primary" /> Sobre mim
            </h2>
            <p className="mt-3 text-sm leading-6 text-card-foreground">
              {profile?.bio ||
                (profile?.favorite_position
                  ? `${profile.favorite_position} em campo.`
                  : "Você ainda não escreveu uma apresentação. Toque no lápis para editar.")}
            </p>
            {memberSince && (
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="size-4" /> Membro desde {memberSince}
              </p>
            )}
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/jogador/$userId", params: { userId: user.id } })}
              className="mt-4 w-full rounded-full font-bold"
            >
              <ExternalLink /> Ver meu perfil público
            </Button>
          </article>
        )}
      </section>

      {templates.length > 0 && (
        <section className="mx-auto mt-6 max-w-lg px-5">
          <div className="mb-3 flex items-center gap-2">
            <Pin className="size-4 text-primary" />
            <p className="text-mono-label text-primary">Minhas peladas fixas</p>
          </div>
          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.id} className="rounded-2xl border border-primary/25 bg-card p-4 shadow-sm">
                <p className="truncate font-bold">{t.name}</p>
                <p className="mt-0.5 font-mono text-xs uppercase tracking-wider text-primary">
                  toda {WEEKDAY_LABEL[t.weekday]} · {t.time_of_day.slice(0, 5)}
                </p>
                <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <MapPin className="size-3 flex-none" /> {t.location_name}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    onClick={() => repeatTemplate(t.id)}
                    disabled={busyTemplate === t.id}
                    className="flex-1 rounded-xl font-bold uppercase"
                  >
                    <Repeat /> Criar próxima
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => deactivateTemplate(t.id)}
                    disabled={busyTemplate === t.id}
                    className="rounded-xl font-bold uppercase"
                  >
                    Desativar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto mt-6 max-w-lg px-5">
        <p className="text-mono-label mb-3">Peladas que organizei</p>
        {myPeladas.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card py-8 text-center text-sm text-muted-foreground">
            Você ainda não organizou nenhuma pelada.
          </p>
        ) : (
          <div className="space-y-2">
            {myPeladas.map((p) => (
              <a
                key={p.id}
                href={`/pelada/${p.id}`}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-bold">{p.name}</p>
                    {p.template_id && (
                      <span className="flex flex-none items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">
                        <Pin className="size-2.5" /> Fixa
                      </span>
                    )}
                  </div>
                  <p className="truncate font-mono text-xs tabular-nums text-muted-foreground">
                    {new Date(p.starts_at).toLocaleDateString("pt-BR")} · {p.filled_slots}/{p.total_slots} vagas
                  </p>
                </div>
                <span
                  className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${
                    p.status === "open" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {p.status === "open" ? "Aberta" : p.status}
                </span>
              </a>
            ))}
          </div>
        )}
      </section>

      {isAdmin ? (
        <section className="mx-auto mt-8 max-w-lg px-5">
          <Button onClick={() => navigate({ to: "/admin" })} className="h-14 w-full rounded-2xl font-extrabold uppercase">
            <ShieldCheck className="size-5" /> Painel do administrador
          </Button>
        </section>
      ) : profile?.phone === ADMIN_PHONE_DIGITS ? (
        <section className="mx-auto mt-8 max-w-lg px-5">
          <p className="text-mono-label mb-3">Modo desenvolvedor</p>
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <input
              type="password"
              value={devKey}
              onChange={(e) => setDevKey(e.target.value)}
              placeholder="Chave de desenvolvedor"
              className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
            />
            <Button onClick={unlockDev} disabled={devBusy || devKey.length < 4} className="w-full rounded-xl font-bold uppercase">
              {devBusy ? "..." : "Desbloquear"}
            </Button>
          </div>
        </section>
      ) : null}

      <BottomNav />
    </main>
  );
}

function Stat({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  tone: "primary" | "warning" | "success";
}) {
  const toneClass = tone === "primary" ? "text-primary" : tone === "warning" ? "text-warning" : "text-success";
  return (
    <div className="rounded-2xl border border-border bg-card px-2 py-4 shadow-sm">
      <div className={`mx-auto flex size-5 items-center justify-center [&>svg]:size-5 ${toneClass}`}>{icon}</div>
      <p className="mt-2 font-mono text-xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
    </div>
  );
}
