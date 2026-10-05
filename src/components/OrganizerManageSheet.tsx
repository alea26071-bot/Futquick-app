import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LocationPicker, type LocationResult } from "@/components/LocationPicker";
import { updatePeladaDetails, removeParticipant, transferPelada, addParticipant } from "@/lib/pelada-group.functions";
import { maxSlotsFor } from "@/lib/pelada-utils";
import type { Database } from "@/integrations/supabase/types";

type Pelada = Database["public"]["Tables"]["peladas"]["Row"];

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function OrganizerManageSheet({ pelada, open, onOpenChange }: { pelada: Pelada; open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const save = useServerFn(updatePeladaDetails);
  const remove = useServerFn(removeParticipant);
  const transfer = useServerFn(transferPelada);
  const add = useServerFn(addParticipant);
  const [form, setForm] = useState(() => ({
    name: pelada.name,
    description: pelada.description ?? "",
    startsAt: toLocalInput(pelada.starts_at),
    totalSlots: pelada.total_slots,
    autoApprove: pelada.auto_approve,
    waitlistEnabled: pelada.waitlist_enabled,
    groupPermanent: pelada.group_mode === "permanent",
    loc: { name: pelada.location_name, address: pelada.address, lat: pelada.latitude, lng: pelada.longitude },
  }));
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: pelada.name,
      description: pelada.description ?? "",
      startsAt: toLocalInput(pelada.starts_at),
      totalSlots: pelada.total_slots,
      autoApprove: pelada.auto_approve,
      waitlistEnabled: pelada.waitlist_enabled,
    groupPermanent: pelada.group_mode === "permanent",
      loc: { name: pelada.location_name, address: pelada.address, lat: pelada.latitude, lng: pelada.longitude },
    });
  }, [open, pelada]);

  const { data: members = [] } = useQuery({
    queryKey: ["pelada-manage-members", pelada.id],
    enabled: open,
    queryFn: async () => {
      const { data: reqs } = await supabase.from("pelada_requests").select("user_id").eq("pelada_id", pelada.id).eq("status", "accepted");
      const ids = (reqs ?? []).map((r) => r.user_id);
      if (!ids.length) return [];
      const { data } = await supabase.from("profiles").select("id, name, avatar_url").in("id", ids);
      return data ?? [];
    },
  });

  const [search, setSearch] = useState("");
  const term = search.trim().replace(/^@/, "").replace(/[%,()]/g, "");
  const { data: results = [] } = useQuery({
    queryKey: ["pelada-add-search", pelada.id, term],
    enabled: open && term.length >= 2,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, name, username, avatar_url")
        .or(`name.ilike.%${term}%,username.ilike.%${term}%`)
        .neq("id", pelada.organizer_id)
        .is("suspended_at", null)
        .limit(8);
      return data ?? [];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["pelada", pelada.id] });
    qc.invalidateQueries({ queryKey: ["pelada-manage-members", pelada.id] });
    qc.invalidateQueries({ queryKey: ["peladas"] });
  };

  const submit = async (finish = false) => {
    if (finish && !window.confirm("Encerrar a pelada? Ela deixa de aceitar jogadores.")) return;
    setBusy(true);
    try {
      await save({
        data: {
          peladaId: pelada.id,
          name: form.name,
          description: form.description.trim() || null,
          startsAt: new Date(form.startsAt).toISOString(),
          totalSlots: Number(form.totalSlots),
          autoApprove: form.autoApprove,
          waitlistEnabled: form.waitlistEnabled,
          groupMode: form.groupPermanent ? "permanent" : "temporary",
          locationName: form.loc.name,
          address: form.loc.address,
          latitude: form.loc.lat,
          longitude: form.loc.lng,
          finish,
        },
      });
      toast.success(finish ? "Pelada encerrada" : "Pelada atualizada");
      refresh();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  };

  const doAdd = async (id: string, name: string) => {
    try {
      const r = await add({ data: { peladaId: pelada.id, userId: id } });
      toast.success(r.status === "already" ? `${name} já está no grupo` : `${name} adicionado à pelada e ao chat`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const doRemove = async (id: string, name: string) => {
    if (!window.confirm(`Remover ${name} da pelada?`)) return;
    try {
      await remove({ data: { peladaId: pelada.id, userId: id } });
      toast.success("Jogador removido");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const doTransfer = async (id: string, name: string) => {
    if (!window.confirm(`Transferir a organização para ${name}? Você continuará como jogador.`)) return;
    try {
      await transfer({ data: { peladaId: pelada.id, userId: id } });
      toast.success("Organização transferida");
      refresh();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const input = "w-full h-12 px-4 rounded-2xl bg-navy-soft border border-white/10 text-white text-sm";
  const label = "text-mono-label text-white/50 mb-1 block";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="bg-navy border-white/10 rounded-t-3xl max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white font-display font-extrabold italic uppercase">Gerenciar pelada</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4 pb-6">
            <div>
              <span className={label}>Nome</span>
              <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className={label}>Data e horário</span>
                <input type="datetime-local" className={input} value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
              </div>
              <div>
                <span className={label}>Total de vagas</span>
                <input type="number" min={2} max={maxSlotsFor(pelada.field_type)} className={input} value={form.totalSlots} onChange={(e) => setForm({ ...form, totalSlots: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <span className={label}>Local</span>
              <button onClick={() => setPicking(true)} className={`${input} text-left truncate`}>
                {form.loc.name} · <span className="text-white/50">{form.loc.address}</span>
              </button>
            </div>
            <div>
              <span className={label}>Descrição</span>
              <textarea className={`${input} h-24 py-3`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <label className="flex items-center justify-between p-4 rounded-2xl bg-navy-soft border border-white/10">
              <span className="text-sm text-white font-bold">Entrada automática (sem aprovação)</span>
              <input type="checkbox" checked={form.autoApprove} onChange={(e) => setForm({ ...form, autoApprove: e.target.checked })} className="size-5 accent-[var(--color-cyan)]" />
            </label>
            <label className="flex items-center justify-between p-4 rounded-2xl bg-navy-soft border border-white/10">
              <span className="text-sm text-white font-bold">Lista de espera quando lotar</span>
              <input type="checkbox" checked={form.waitlistEnabled} onChange={(e) => setForm({ ...form, waitlistEnabled: e.target.checked })} className="size-5 accent-[var(--color-cyan)]" />
            </label>
            <label className="flex items-center justify-between p-4 rounded-2xl bg-navy-soft border border-white/10">
              <span className="text-sm text-white font-bold">Manter o grupo ativo após a pelada (até eu encerrar)</span>
              <input type="checkbox" checked={form.groupPermanent} onChange={(e) => setForm({ ...form, groupPermanent: e.target.checked })} className="size-5 accent-[var(--color-cyan)]" />
            </label>
            <button onClick={() => submit(false)} disabled={busy} className="w-full py-4 rounded-2xl bg-cyan text-navy font-display font-extrabold italic uppercase disabled:opacity-50">
              Salvar alterações
            </button>

            <div className="space-y-2">
              <p className="text-mono-label text-white/50">Adicionar jogador</p>
              <input className={input} placeholder="Buscar pelo nome ou usuário" value={search} onChange={(e) => setSearch(e.target.value)} />
              {results.map((u) => {
                const isIn = members.some((m) => m.id === u.id);
                return (
                  <div key={u.id} className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-navy-soft border border-white/5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="size-9 rounded-full bg-cyan/20 overflow-hidden grid place-items-center flex-none">
                        {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-cyan text-sm font-bold">{u.name?.[0]}</span>}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-white font-bold truncate">{u.name}</p>
                        {u.username && <p className="text-xs text-white/50 truncate">@{u.username}</p>}
                      </div>
                    </div>
                    <button disabled={isIn} onClick={() => doAdd(u.id, u.name)} className="px-3 py-1.5 rounded-lg bg-cyan text-navy text-[11px] font-bold uppercase disabled:opacity-40 flex-none">
                      {isIn ? "No grupo" : "Adicionar"}
                    </button>
                  </div>
                );
              })}
            </div>

            {members.length > 0 && (
              <div className="space-y-2">
                <p className="text-mono-label text-white/50">Participantes</p>
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-navy-soft border border-white/5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="size-9 rounded-full bg-cyan/20 overflow-hidden grid place-items-center flex-none">
                        {m.avatar_url ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-cyan text-sm font-bold">{m.name?.[0]}</span>}
                      </div>
                      <p className="text-sm text-white font-bold truncate">{m.name}</p>
                    </div>
                    <div className="flex gap-1 flex-none">
                      <button onClick={() => doTransfer(m.id, m.name)} className="px-2 py-1.5 rounded-lg bg-cyan/10 text-cyan text-[11px] font-bold uppercase">Tornar organizador</button>
                      <button onClick={() => doRemove(m.id, m.name)} className="px-2 py-1.5 rounded-lg bg-destructive/10 text-destructive text-[11px] font-bold uppercase">Remover</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pelada.status !== "finished" && (
              <button onClick={() => submit(true)} disabled={busy} className="w-full py-3 rounded-2xl bg-navy-soft border border-white/10 text-white/70 font-bold uppercase text-xs">
                Encerrar pelada
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>
      {picking && (
        <LocationPicker
          onClose={() => setPicking(false)}
          onConfirm={(l: LocationResult) => {
            setForm({ ...form, loc: { name: l.name, address: l.address, lat: l.lat, lng: l.lng } });
            setPicking(false);
          }}
        />
      )}
    </>
  );
}
