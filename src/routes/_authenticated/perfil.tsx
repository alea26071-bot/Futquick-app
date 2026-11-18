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
  ImagePlus,
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
  Clock3,
  UsersRound,
  ChevronRight,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { uploadUserPhoto } from "@/lib/storage-helpers";
import { useTheme } from "@/lib/theme";
import { WEEKDAY_LABEL } from "@/lib/pelada-utils";
import { createNextFromTemplate, setTemplateActive } from "@/lib/pelada-templates.functions";
import { Button } from "@/components/ui/button";
import { ProfileStat as Stat, ProfileAbout, ProfileSportIcon } from "@/components/ProfilePresentation";
import { ProfileCover } from "@/components/ProfileCover";
import { ProfileCoverEditor } from "@/components/ProfileCoverEditor";
import { useGameTerm } from "@/components/GameTermProvider";

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
  const labels = useGameTerm();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { theme, toggle } = useTheme();
  const [editing, setEditing] = useState(false);
  const [coverEditorOpen, setCoverEditorOpen] = useState(false);
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
    <main className="profile-page min-h-screen bg-background pb-28 text-foreground">
      <ProfileCover paths={profile?.cover_photo_paths ?? []} fallback={profile?.avatar_url} name={profile?.name || "jogador"}>
        <div className="absolute inset-x-0 top-0 flex items-center justify-end gap-2 px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Opções do perfil" className="profile-cover-action">
                <MoreVertical className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-2xl">
              <DropdownMenuItem onClick={toggle} className="gap-2">
                {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                {theme === "dark" ? "Modo claro" : "Modo escuro"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => (editing ? save() : setEditing(true))} className="gap-2">
                {editing ? <Check className="size-4" /> : <Edit3 className="size-4" />}
                {editing ? "Salvar perfil" : "Editar perfil"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut} className="gap-2 text-destructive focus:text-destructive">
                <LogOut className="size-4" />
                Sair da conta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Button variant="ghost" size="icon" className="profile-cover-action absolute left-5 top-[max(1.25rem,env(safe-area-inset-top))]" aria-label="Editar fotos de capa" title="Editar fotos de capa" onClick={() => setCoverEditorOpen(true)}><ImagePlus /></Button>
      </ProfileCover>
      <ProfileCoverEditor userId={user.id} paths={profile?.cover_photo_paths ?? []} open={coverEditorOpen} onOpenChange={setCoverEditorOpen} />

      <section className="profile-identity relative z-10 mx-auto -mt-20 max-w-lg px-5 text-center">
        <Button variant="ghost"
          onClick={() => fileRef.current?.click()}
          aria-label="Trocar foto de perfil"
          className="profile-avatar group relative mx-auto block size-28 overflow-hidden rounded-full border-4 border-background bg-secondary shadow-xl"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Sua foto de perfil" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center">
              <CircleUserRound className="size-12 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 grid place-items-center bg-background/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="size-6 text-foreground" />
          </div>
          {uploadingAvatar && (
            <div className="absolute inset-0 grid place-items-center bg-background/70">
              <div className="size-6 animate-spin rounded-full border-2 border-cyan border-t-transparent" />
            </div>
          )}
        </Button>
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
          <h1 className="profile-name mt-4 text-3xl font-extrabold">{profile?.name || "Sem nome"}</h1>
        )}
        <p className="profile-handle mt-1 text-sm text-muted-foreground">@{handle}</p>

        {profile?.phone_verified && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-primary">
            <BadgeCheck className="size-5 fill-primary text-primary-foreground" /> Jogador verificado
          </p>
        )}
        {!editing && (profile?.city || profile?.state) && (
          <p className="profile-location mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5" /> {[profile?.city, profile?.state].filter(Boolean).join(", ")}
            {profile?.age ? ` · ${profile.age} anos` : ""}
          </p>
        )}

        <div className="profile-stats mt-6 grid grid-cols-3 gap-3">
          <Stat icon={<CircleUserRound />} value={profile?.peladas_played ?? 0} label={labels.plural} tone="primary" />
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
                  <Button variant="ghost"
                    key={p}
                    onClick={() => setForm({ ...form, favorite_position: p })}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase ${
                      form.favorite_position === p
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {p}
                  </Button>
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
          <ProfileAbout
            title="Sobre mim"
            bio={profile?.bio || (profile?.favorite_position ? `${profile.favorite_position} em campo.` : "Sem apresentação.")}
            memberSince={memberSince}
          />
        )}
      </section>

      {templates.length > 0 && (
        <section className="mx-auto mt-6 max-w-lg px-5">
          <h2 className="profile-section-title"><Pin /> {labels.active}</h2>
          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.id} className="profile-game">
                <div className="profile-game-header">
                  <ProfileSportIcon sport={t.field_type} />
                  <div className="min-w-0 flex-1">
                    <p className="profile-game-name">{t.name}</p>
                    <p className="profile-game-detail profile-game-schedule"><Clock3 /> Toda {WEEKDAY_LABEL[t.weekday]} · {t.time_of_day.slice(0, 5)}</p>
                    <p className="profile-game-detail"><MapPin /><span className="truncate">{t.location_name}</span></p>
                  </div>
                </div>
                <div className="profile-game-actions">
                  <Button onClick={() => repeatTemplate(t.id)} disabled={busyTemplate === t.id}>
                    <Repeat /> Criar próxima
                  </Button>
                  <Button variant="secondary" onClick={() => deactivateTemplate(t.id)} disabled={busyTemplate === t.id}>
                    Desativar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto mt-6 max-w-lg px-5">
        <h2 className="profile-section-title"><UsersRound /> {labels.fixed}</h2>
        {myPeladas.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card py-8 text-center text-sm text-muted-foreground">
            Você ainda não organizou nenhuma pelada.
          </p>
        ) : (
          <div className="space-y-2">
            {myPeladas.map((p) => (
              <a key={p.id} href={`/pelada/${p.id}`} className="profile-game profile-game-row">
                <ProfileSportIcon sport={p.field_type} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="profile-game-name">{p.name}</p>
                    {(p.template_id || p.was_recurring) && <span className="profile-game-badge">Fixa</span>}
                  </div>
                  <p className="profile-game-detail"><CalendarDays /><span>{new Date(p.starts_at).toLocaleDateString("pt-BR")} · {p.filled_slots}/{p.total_slots} vagas</span></p>
                </div>
                <span className="profile-game-status" data-open={p.status === "open"}>
                  {p.status === "open" ? "Aberta" : p.status === "finished" ? "Encerrada" : p.status === "full" ? "Lotada" : p.status === "cancelled" ? "Cancelada" : p.status}
                </span>
                <ChevronRight className="size-4 shrink-0" />
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
      ) : null}

      <BottomNav />
    </main>
  );
}

