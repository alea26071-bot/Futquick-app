import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function nameOf(supabase: any, id: string) {
  const { data } = await supabase.from("profiles").select("name").eq("id", id).maybeSingle();
  return (data?.name as string | undefined)?.trim() || "Um jogador";
}

async function notifyWaitlistNext(next: string | null, pelada: { id: string; name: string }) {
  if (!next) return;
  const { notifyUser } = await import("@/lib/notifications.server");
  await notifyUser({
    userId: next,
    type: "waitlist_spot",
    title: "Abriu uma vaga! ⚽",
    body: `Uma vaga foi liberada na ${pelada.name}. Toque para entrar antes que alguém pegue.`,
    url: `/pelada/${pelada.id}`,
    data: { peladaId: pelada.id },
    dedupeKey: `waitlist:${pelada.id}:${next}:${new Date().toISOString().slice(0, 13)}`,
  });
}

const idInput = z.object({ peladaId: z.string().uuid() });

export const joinPelada = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: status, error } = await context.supabase.rpc("join_pelada", { _pelada_id: data.peladaId });
    if (error) throw new Error(error.message);
    const { data: p } = await context.supabase
      .from("peladas")
      .select("id, name, organizer_id, filled_slots, total_slots")
      .eq("id", data.peladaId)
      .single();
    if (p) {
      const { notifyUser } = await import("@/lib/notifications.server");
      const who = await nameOf(context.supabase, context.userId);
      if (status === "accepted") {
        await notifyUser({
          userId: p.organizer_id,
          type: "player_joined",
          title: "Novo jogador confirmado",
          body: `${who} entrou na sua pelada ${p.name}.`,
          url: `/pelada/${p.id}`,
          data: { peladaId: p.id },
          dedupeKey: `joined:${p.id}:${context.userId}`,
        });
        if (p.filled_slots >= p.total_slots) {
          await notifyUser({
            userId: p.organizer_id,
            type: "pelada_full",
            title: "Pelada lotada ⚠️",
            body: `${p.name} está com ${p.filled_slots}/${p.total_slots} jogadores.`,
            url: `/pelada/${p.id}`,
            data: { peladaId: p.id },
            dedupeKey: `full:${p.id}:${p.filled_slots}`,
          });
        }
      } else if (status === "pending") {
        await notifyUser({
          userId: p.organizer_id,
          type: "request_received",
          title: "Nova solicitação de vaga",
          body: `${who} solicitou participar da sua pelada ${p.name}.`,
          url: `/pelada/${p.id}`,
          data: { peladaId: p.id },
          dedupeKey: `requested:${p.id}:${context.userId}`,
        });
      }
    }
    return { status: status as string };
  });

export const leavePelada = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: next, error } = await context.supabase.rpc("leave_pelada", { _pelada_id: data.peladaId });
    if (error) throw new Error(error.message);
    const { data: p } = await context.supabase.from("peladas").select("id, name").eq("id", data.peladaId).single();
    if (p) await notifyWaitlistNext((next as string | null) ?? null, p);
    return { ok: true };
  });

export const removeParticipant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ peladaId: z.string().uuid(), userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: next, error } = await context.supabase.rpc("remove_pelada_participant", {
      _pelada_id: data.peladaId,
      _user_id: data.userId,
    });
    if (error) throw new Error(error.message);
    const { data: p } = await context.supabase.from("peladas").select("id, name").eq("id", data.peladaId).single();
    if (p) await notifyWaitlistNext((next as string | null) ?? null, p);
    return { ok: true };
  });

export const transferPelada = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ peladaId: z.string().uuid(), userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("transfer_pelada", {
      _pelada_id: data.peladaId,
      _new_organizer: data.userId,
    });
    if (error) throw new Error(error.message);
    const { data: p } = await context.supabase.from("peladas").select("id, name").eq("id", data.peladaId).single();
    const { notifyUser } = await import("@/lib/notifications.server");
    await notifyUser({
      userId: data.userId,
      type: "pelada_transferred",
      title: "Você agora organiza uma pelada 👑",
      body: `A organização da ${p?.name ?? "pelada"} foi transferida para você.`,
      url: `/pelada/${data.peladaId}`,
      data: { peladaId: data.peladaId },
    });
    return { ok: true };
  });

const editInput = z.object({
  peladaId: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  description: z.string().max(1000).nullable(),
  startsAt: z.string().datetime(),
  totalSlots: z.number().int().min(2).max(30),
  autoApprove: z.boolean(),
  waitlistEnabled: z.boolean(),
  groupMode: z.enum(["temporary", "permanent"]).optional(),
  locationName: z.string().trim().min(2).max(120),
  address: z.string().trim().min(2).max(250),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  finish: z.boolean().optional(),
});

export const updatePeladaDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => editInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: old } = await context.supabase
      .from("peladas")
      .select("id, organizer_id, starts_at, latitude, longitude, location_name, filled_slots, name")
      .eq("id", data.peladaId)
      .single();
    if (!old || old.organizer_id !== context.userId) throw new Error("Apenas o organizador pode editar");
    if (data.totalSlots < old.filled_slots) {
      throw new Error(`Já há ${old.filled_slots} confirmados — o total não pode ser menor.`);
    }
    const { error } = await context.supabase
      .from("peladas")
      .update({
        name: data.name,
        description: data.description,
        starts_at: data.startsAt,
        total_slots: data.totalSlots,
        auto_approve: data.autoApprove,
        waitlist_enabled: data.waitlistEnabled,
        ...(data.groupMode ? { group_mode: data.groupMode } : {}),
        location_name: data.locationName,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        ...(data.finish ? { status: "finished" } : {}),
      })
      .eq("id", data.peladaId);
    if (error) throw new Error(error.message);

    const timeChanged = new Date(old.starts_at).getTime() !== new Date(data.startsAt).getTime();
    const placeChanged = old.latitude !== data.latitude || old.longitude !== data.longitude || old.location_name !== data.locationName;
    if (timeChanged || placeChanged || data.finish) {
      const { data: members } = await context.supabase
        .from("pelada_requests")
        .select("user_id")
        .eq("pelada_id", data.peladaId)
        .eq("status", "accepted")
        .limit(100);
      const { notifyUser } = await import("@/lib/notifications.server");
      const title = data.finish
        ? "Pelada encerrada"
        : placeChanged
          ? "📍 O local da pelada foi alterado"
          : "🕐 O horário da pelada foi alterado";
      const when = new Date(data.startsAt).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
      });
      for (const m of members ?? []) {
        if (m.user_id === context.userId) continue;
        await notifyUser({
          userId: m.user_id,
          type: data.finish ? "pelada_finished" : placeChanged ? "pelada_location_changed" : "pelada_time_changed",
          title,
          body: data.finish ? `${data.name} foi encerrada pelo organizador.` : `${data.name} · ${when} em ${data.locationName}.`,
          url: `/pelada/${data.peladaId}`,
          data: { peladaId: data.peladaId },
        });
      }
    }
    return { ok: true };
  });

/** Notifies every member of the group (except the sender) about a new group message. */
export const notifyGroupMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ messageId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: msg } = await context.supabase
      .from("pelada_group_messages")
      .select("id, pelada_id, sender_id, body, kind, peladas(name, organizer_id)")
      .eq("id", data.messageId)
      .maybeSingle();
    if (!msg || msg.sender_id !== context.userId) throw new Error("Mensagem não encontrada");
    const pelada = msg.peladas as unknown as { name: string; organizer_id: string } | null;
    const { data: members } = await context.supabase
      .from("pelada_requests")
      .select("user_id")
      .eq("pelada_id", msg.pelada_id)
      .eq("status", "accepted")
      .limit(100);
    const ids = new Set<string>((members ?? []).map((m) => m.user_id));
    if (pelada) ids.add(pelada.organizer_id);
    ids.delete(context.userId);
    const who = await nameOf(context.supabase, context.userId);
    const preview = msg.kind === "image" ? "📷 Foto" : msg.kind === "location" ? "📍 Localização" : msg.body;
    const { notifyUser } = await import("@/lib/notifications.server");
    for (const uid of ids) {
      await notifyUser({
        userId: uid,
        type: "group_message",
        title: `💬 ${who} · ${pelada?.name ?? "Grupo"}`,
        body: preview,
        url: `/grupo/${msg.pelada_id}`,
        data: { peladaId: msg.pelada_id },
      });
    }
    return { ok: true };
  });

export const addParticipant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ peladaId: z.string().uuid(), userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: status, error } = await context.supabase.rpc("add_pelada_participant", {
      _pelada_id: data.peladaId,
      _user_id: data.userId,
    });
    if (error) throw new Error(error.message);
    if (status === "accepted") {
      const { data: p } = await context.supabase.from("peladas").select("id, name").eq("id", data.peladaId).single();
      const who = await nameOf(context.supabase, context.userId);
      const { notifyUser } = await import("@/lib/notifications.server");
      await notifyUser({
        userId: data.userId,
        type: "added_to_pelada",
        title: "Você foi adicionado a uma pelada ⚽",
        body: `${who} te adicionou na ${p?.name ?? "pelada"}. O chat do grupo já está liberado.`,
        url: `/grupo/${data.peladaId}`,
        data: { peladaId: data.peladaId },
        dedupeKey: `added:${data.peladaId}:${data.userId}`,
      });
    }
    return { status: status as string };
  });
