import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Save, Trash2, Users, CalendarDays, ClipboardList } from "lucide-react";
import {
  adminOverview,
  adminUpdateProfile,
  adminDeletePelada,
  adminUpdatePelada,
  adminDeleteUser,

} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel do administrador · Futquick" },
      { name: "description", content: "Gestão de usuários, peladas e solicitações do Futquick." },
      { property: "og:title", content: "Painel do administrador · Futquick" },
      { property: "og:description", content: "Gestão interna do Futquick." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

type Tab = "users" | "peladas" | "requests";

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchOverview = useServerFn(adminOverview);
  const updateProfile = useServerFn(adminUpdateProfile);
  const deletePelada = useServerFn(adminDeletePelada);
  const deleteUser = useServerFn(adminDeleteUser);
  const [tab, setTab] = useState<Tab>("users");
  const updatePelada = useServerFn(adminUpdatePelada);
  const [editingPelada, setEditingPelada] = useState<string | null>(null);
  const [pDraft, setPDraft] = useState({
    name: "",
    location_name: "",
    city: "",
    starts_at: "",
    total_slots: "",
    filled_slots: "",
    price: "",
    status: "open",
  });
  const [editing, setEditing] = useState<string | null>(null);

  const [draft, setDraft] = useState<{ name: string; city: string; state: string; age: string; radius: string }>({
    name: "",
    city: "",
    state: "",
    age: "",
    radius: "",
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => fetchOverview(),
    retry: false,
  });

  if (error) {
    return (
      <div className="min-h-screen bg-navy px-6 pt-16">
        <p className="text-white/80">{error instanceof Error ? error.message : "Acesso restrito"}</p>
        <button onClick={() => navigate({ to: "/perfil" })} className="mt-4 text-cyan underline">
          Voltar ao perfil
        </button>
      </div>
    );
  }

  const users = data?.users ?? [];
  const peladas = data?.peladas ?? [];
  const requests = data?.requests ?? [];

  const startEdit = (u: (typeof users)[number]) => {
    setEditing(u.id);
    setDraft({
      name: u.name ?? "",
      city: u.city ?? "",
      state: u.state ?? "",
      age: u.age?.toString() ?? "",
      radius: u.notify_radius_km?.toString() ?? "",
    });
  };

  const saveEdit = async (id: string) => {
    try {
      await updateProfile({
        data: {
          id,
          name: draft.name.trim(),
          city: draft.city.trim() || null,
          state: draft.state.trim().toUpperCase() || null,
          age: draft.age ? parseInt(draft.age, 10) : null,
          notify_radius_km: draft.radius ? parseInt(draft.radius, 10) : null,
        },
      });
      toast.success("Usuário atualizado");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  const removeUser = async (id: string, name: string) => {
    if (!confirm(`Excluir permanentemente ${name || "este usuário"}?`)) return;
    try {
      await deleteUser({ data: { userId: id } });
      toast.success("Usuário excluído");
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  };

  const removePelada = async (id: string, name: string) => {
    if (!confirm(`Excluir a pelada "${name}"?`)) return;
    try {
      await deletePelada({ data: { peladaId: id } });
      toast.success("Pelada excluída");
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  };

  const startEditPelada = (p: (typeof peladas)[number]) => {
    setEditingPelada(p.id);
    const d = new Date(p.starts_at);
    const pad = (n: number) => String(n).padStart(2, "0");
    setPDraft({
      name: p.name ?? "",
      location_name: p.location_name ?? "",
      city: p.city ?? "",
      starts_at: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
      total_slots: p.total_slots?.toString() ?? "",
      filled_slots: p.filled_slots?.toString() ?? "",
      price: ((p.price_cents ?? 0) / 100).toString(),
      status: p.status ?? "open",
    });
  };

  const savePelada = async (id: string) => {
    try {
      const total = parseInt(pDraft.total_slots, 10);
      const filled = parseInt(pDraft.filled_slots, 10);
      await updatePelada({
        data: {
          id,
          name: pDraft.name.trim(),
          location_name: pDraft.location_name.trim(),
          city: pDraft.city.trim() || null,
          starts_at: new Date(pDraft.starts_at).toISOString(),
          ...(Number.isFinite(total) ? { total_slots: total } : {}),
          ...(Number.isFinite(filled) ? { filled_slots: filled } : {}),
          price_cents: Math.round((parseFloat(pDraft.price.replace(",", ".")) || 0) * 100),
          status: pDraft.status,
        },
      });
      toast.success("Pelada atualizada");
      setEditingPelada(null);
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };


  return (
    <div className="min-h-screen bg-navy pb-16">
      <header className="pt-12 px-5 pb-4 bg-navy-soft/60 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/perfil" })}
            className="size-9 rounded-full bg-navy border border-white/10 grid place-items-center"
            aria-label="Voltar"
          >
            <ArrowLeft className="size-4 text-white" />
          </button>
          <h1 className="font-display font-extrabold italic uppercase text-xl text-white">
            Painel do adm
          </h1>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <Stat label="Usuários" value={users.length} icon={<Users className="size-3.5" />} />
          <Stat label="Peladas" value={peladas.length} icon={<CalendarDays className="size-3.5" />} />
          <Stat label="Pedidos" value={requests.length} icon={<ClipboardList className="size-3.5" />} />
        </div>
        <div className="flex gap-2 mt-4">
          {(["users", "peladas", "requests"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase border ${
                tab === t ? "bg-cyan text-navy border-cyan" : "border-white/10 text-white/60"
              }`}
            >
              {t === "users" ? "Usuários" : t === "peladas" ? "Peladas" : "Solicitações"}
            </button>
          ))}
        </div>
      </header>

      {isLoading ? (
        <p className="text-white/40 text-sm px-5 pt-8">Carregando...</p>
      ) : (
        <main className="px-5 pt-5 space-y-3">
          {tab === "users" &&
            users.map((u) => (
              <div key={u.id} className="p-4 bg-navy-soft/60 rounded-2xl border border-white/5">
                {editing === u.id ? (
                  <div className="space-y-2">
                    <Field label="Nome" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
                    <div className="flex gap-2">
                      <Field label="Cidade" value={draft.city} onChange={(v) => setDraft({ ...draft, city: v })} />
                      <Field label="UF" value={draft.state} onChange={(v) => setDraft({ ...draft, state: v })} />
                    </div>
                    <div className="flex gap-2">
                      <Field label="Idade" value={draft.age} onChange={(v) => setDraft({ ...draft, age: v })} />
                      <Field label="Raio (km)" value={draft.radius} onChange={(v) => setDraft({ ...draft, radius: v })} />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => saveEdit(u.id)}
                        className="flex-1 py-2.5 rounded-xl bg-cyan text-navy font-bold uppercase text-xs flex items-center justify-center gap-2"
                      >
                        <Save className="size-4" /> Salvar
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="px-4 py-2.5 rounded-xl bg-navy border border-white/10 text-white/70 text-xs font-bold uppercase"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{u.name || "Sem nome"}</p>
                        <p className="text-xs text-white/50 font-mono">{u.phone ?? "sem telefone"}</p>
                        <p className="text-xs text-white/50 mt-1 flex items-center gap-1">
                          <MapPin className="size-3" />
                          {[u.city, u.state].filter(Boolean).join(" · ") || "região não informada"}
                        </p>
                        <p className="text-[11px] text-white/40 mt-1">
                          {u.age ? `${u.age} anos · ` : ""}raio {u.notify_radius_km ?? "—"} km · postura{" "}
                          {u.posture_average == null ? "—" : `${Math.round(u.posture_average)}%`}
                        </p>
                        {u.latitude != null && u.longitude != null && (
                          <p className="text-[11px] text-cyan/70 font-mono mt-0.5">
                            {u.latitude.toFixed(4)}, {u.longitude.toFixed(4)}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 flex-none">
                        <button
                          onClick={() => startEdit(u)}
                          className="px-3 py-1.5 rounded-lg bg-navy border border-white/10 text-white/70 text-[11px] font-bold uppercase"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => removeUser(u.id, u.name)}
                          className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-[11px] font-bold uppercase flex items-center gap-1"
                        >
                          <Trash2 className="size-3" /> Excluir
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}

          {tab === "peladas" &&
            peladas.map((p) => (
              <div key={p.id} className="p-4 bg-navy-soft/60 rounded-2xl border border-white/5">
                {editingPelada === p.id ? (
                  <div className="space-y-2">
                    <Field
                      label="Nome"
                      value={pDraft.name}
                      onChange={(v) => setPDraft({ ...pDraft, name: v })}
                    />
                    <div className="flex gap-2">
                      <Field
                        label="Local"
                        value={pDraft.location_name}
                        onChange={(v) => setPDraft({ ...pDraft, location_name: v })}
                      />
                      <Field
                        label="Cidade"
                        value={pDraft.city}
                        onChange={(v) => setPDraft({ ...pDraft, city: v })}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] uppercase tracking-wider text-white/40">
                        Data e hora
                      </label>
                      <input
                        type="datetime-local"
                        value={pDraft.starts_at}
                        onChange={(e) => setPDraft({ ...pDraft, starts_at: e.target.value })}
                        className="w-full mt-1 p-2.5 rounded-xl bg-navy border border-white/10 text-white text-sm focus:border-cyan outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Field
                        label="Total vagas"
                        value={pDraft.total_slots}
                        onChange={(v) => setPDraft({ ...pDraft, total_slots: v })}
                      />
                      <Field
                        label="Confirmados"
                        value={pDraft.filled_slots}
                        onChange={(v) => setPDraft({ ...pDraft, filled_slots: v })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Field
                        label="Preço (R$)"
                        value={pDraft.price}
                        onChange={(v) => setPDraft({ ...pDraft, price: v })}
                      />
                      <div className="flex-1">
                        <label className="text-[10px] uppercase tracking-wider text-white/40">
                          Status
                        </label>
                        <select
                          value={pDraft.status}
                          onChange={(e) => setPDraft({ ...pDraft, status: e.target.value })}
                          className="w-full mt-1 p-2.5 rounded-xl bg-navy border border-white/10 text-white text-sm focus:border-cyan outline-none"
                        >
                          <option value="open">open</option>
                          <option value="full">full</option>
                          <option value="closed">closed</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => savePelada(p.id)}
                        className="flex-1 py-2.5 rounded-xl bg-cyan text-navy font-bold uppercase text-xs flex items-center justify-center gap-2"
                      >
                        <Save className="size-4" /> Salvar
                      </button>
                      <button
                        onClick={() => setEditingPelada(null)}
                        className="px-4 py-2.5 rounded-xl bg-navy border border-white/10 text-white/70 text-xs font-bold uppercase"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{p.name}</p>
                      <p className="text-xs text-white/50 truncate">{p.location_name}</p>
                      <p className="text-[11px] text-white/40 mt-1">
                        {new Date(p.starts_at).toLocaleString("pt-BR")} · {p.filled_slots}/
                        {p.total_slots} · {p.status}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 flex-none">
                      <button
                        onClick={() => startEditPelada(p)}
                        className="px-3 py-1.5 rounded-lg bg-navy border border-white/10 text-white/70 text-[11px] font-bold uppercase"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => removePelada(p.id, p.name)}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-[11px] font-bold uppercase flex items-center gap-1"
                      >
                        <Trash2 className="size-3" /> Excluir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}


          {tab === "requests" &&
            requests.map((r) => (
              <div key={r.id} className="p-4 bg-navy-soft/60 rounded-2xl border border-white/5">
                <p className="text-xs text-white/70 font-mono truncate">pelada {r.pelada_id}</p>
                <p className="text-xs text-white/50 font-mono truncate">usuário {r.user_id}</p>
                <p className="text-[11px] text-cyan mt-1 uppercase font-bold">{r.status}</p>
              </div>
            ))}
        </main>
      )}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="p-3 bg-navy rounded-xl border border-white/5 text-center">
      <p className="text-xl font-display font-extrabold italic text-cyan">{value}</p>
      <p className="text-[10px] text-white/50 uppercase font-bold tracking-wider flex items-center justify-center gap-1">
        {icon}
        {label}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex-1">
      <label className="text-[10px] uppercase tracking-wider text-white/40">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 p-2.5 rounded-xl bg-navy border border-white/10 text-white text-sm focus:border-cyan outline-none"
      />
    </div>
  );
}
