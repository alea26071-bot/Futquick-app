import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";
import { LogOut, Edit3, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/perfil")({
  ssr: false,
  component: PerfilPage,
});

const POSITIONS = ["Goleiro", "Zagueiro", "Lateral", "Volante", "Meia", "Atacante"];

function PerfilPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

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

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (isLoading) return <div className="min-h-screen bg-navy" />;

  return (
    <div className="min-h-screen bg-navy pb-28">
      <div className="relative pt-12 px-6 pb-6 bg-gradient-to-b from-navy-soft to-navy">
        <div className="flex justify-end gap-2 mb-6">
          <button
            onClick={() => (editing ? save() : setEditing(true))}
            className="size-10 rounded-full bg-navy-soft border border-white/10 grid place-items-center"
          >
            {editing ? <Check className="size-4 text-cyan" /> : <Edit3 className="size-4 text-white/70" />}
          </button>
          <button onClick={signOut} className="size-10 rounded-full bg-navy-soft border border-white/10 grid place-items-center">
            <LogOut className="size-4 text-white/70" />
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="size-20 rounded-full bg-cyan/20 border-2 border-cyan/40 grid place-items-center overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-cyan text-2xl font-bold">
                {(profile?.name || user.email || "?")[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full text-2xl font-display font-extrabold italic uppercase bg-transparent border-b border-white/20 pb-1 text-white focus:border-cyan outline-none"
              />
            ) : (
              <h1 className="text-2xl font-display font-extrabold italic uppercase text-white truncate">
                {profile?.name || "Sem nome"}
              </h1>
            )}
            <p className="text-white/50 text-sm truncate">{user.email}</p>
          </div>
        </div>

        {editing ? (
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-mono-label">Cidade</label>
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full mt-1 p-3 rounded-xl bg-navy-soft border border-white/10 text-white text-sm focus:border-cyan outline-none"
                />
              </div>
              <div className="w-24">
                <label className="text-mono-label">Idade</label>
                <input
                  type="number"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  className="w-full mt-1 p-3 rounded-xl bg-navy-soft border border-white/10 text-white text-sm focus:border-cyan outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-mono-label">Posição favorita</label>
              <div className="flex gap-2 flex-wrap mt-2">
                {POSITIONS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setForm({ ...form, favorite_position: p })}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase border ${
                      form.favorite_position === p ? "bg-cyan text-navy border-cyan" : "border-white/10 text-white/60"
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
                rows={2}
                className="w-full mt-1 p-3 rounded-xl bg-navy-soft border border-white/10 text-white text-sm focus:border-cyan outline-none resize-none"
              />
            </div>
          </div>
        ) : (
          <>
            {profile?.city && (
              <p className="text-white/70 text-sm">
                {profile.city}{profile.age ? ` · ${profile.age} anos` : ""}
              </p>
            )}
            {profile?.bio && <p className="text-white/60 text-sm mt-2">{profile.bio}</p>}
          </>
        )}

        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="p-3 bg-navy-soft/60 rounded-2xl border border-white/5 text-center">
            <p className="text-2xl font-display font-extrabold italic text-white">{profile?.peladas_played ?? 0}</p>
            <p className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Peladas</p>
          </div>
          <div className="p-3 bg-navy-soft/60 rounded-2xl border border-white/5 text-center">
            <p className="text-2xl font-display font-extrabold italic text-white">
              {profile?.rating_avg ? Number(profile.rating_avg).toFixed(1) : "—"}
            </p>
            <p className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Nota</p>
          </div>
          <div className="p-3 bg-navy-soft/60 rounded-2xl border border-cyan/20 text-center">
            <p className="text-2xl font-display font-extrabold italic text-cyan">{profile?.postura_score ?? 100}%</p>
            <p className="text-[10px] text-cyan/70 uppercase font-bold tracking-wider">Postura</p>
          </div>
        </div>
      </div>

      <div className="px-6 mt-6">
        <p className="text-mono-label mb-3">Peladas que organizei</p>
        {myPeladas.length === 0 ? (
          <p className="text-sm text-white/50 py-8 text-center bg-navy-soft/40 rounded-2xl border border-white/5">
            Você ainda não organizou nenhuma pelada.
          </p>
        ) : (
          <div className="space-y-2">
            {myPeladas.map((p) => (
              <a
                key={p.id}
                href={`/pelada/${p.id}`}
                className="flex justify-between items-center p-4 bg-navy-soft/60 rounded-2xl border border-white/5"
              >
                <div className="min-w-0">
                  <p className="font-bold text-white truncate">{p.name}</p>
                  <p className="text-xs text-white/50 truncate">
                    {new Date(p.starts_at).toLocaleDateString("pt-BR")} · {p.filled_slots}/{p.total_slots} vagas
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                    p.status === "open" ? "bg-cyan/10 text-cyan" : "bg-white/5 text-white/40"
                  }`}
                >
                  {p.status === "open" ? "Aberta" : p.status}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
