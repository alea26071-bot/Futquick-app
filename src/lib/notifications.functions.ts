import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Public: browser needs the VAPID public key to subscribe. */
export const getPushConfig = createServerFn({ method: "GET" }).handler(async () => ({
  publicKey: process.env["VAPID_PUBLIC_KEY"] ?? null,
}));

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { endpoint: string; p256dh: string; auth: string; userAgent?: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("push_subscriptions").upsert(
      {
        user_id: context.userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        user_agent: data.userAgent ?? null,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { endpoint: string }) => input)
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", data.endpoint)
      .eq("user_id", context.userId);
    return { ok: true };
  });

/** Called right after a player creates a join request: warns the organizer. */
export const notifyJoinRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { requestId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: request } = await context.supabase
      .from("pelada_requests")
      .select("id, status, user_id, pelada_id, peladas(id, name, organizer_id)")
      .eq("id", data.requestId)
      .maybeSingle();
    if (!request || request.user_id !== context.userId) throw new Error("Solicitação não encontrada");
    const pelada = request.peladas as unknown as { id: string; name: string; organizer_id: string } | null;
    if (!pelada) throw new Error("Pelada não encontrada");

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("name")
      .eq("id", context.userId)
      .maybeSingle();
    const playerName = profile?.name?.trim() || "Um jogador";

    const { notifyUser } = await import("@/lib/notifications.server");
    await notifyUser({
      userId: pelada.organizer_id,
      type: request.status === "accepted" ? "request_auto_accepted" : "request_received",
      title: request.status === "accepted" ? "Novo jogador confirmado" : "Nova solicitação de vaga",
      body:
        request.status === "accepted"
          ? `${playerName} entrou na pelada ${pelada.name}.`
          : `${playerName} quer jogar na pelada ${pelada.name}. Toque para aceitar.`,
      url: `/pelada/${pelada.id}`,
      data: { peladaId: pelada.id, requestId: request.id },
      dedupeKey: `request:${request.id}:${request.status}`,
    });
    return { ok: true };
  });

/** Organizer accepts or rejects a request; the player is notified. */
export const respondToJoinRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { requestId: string; status: "accepted" | "rejected" }) => input)
  .handler(async ({ data, context }) => {
    const { data: request } = await context.supabase
      .from("pelada_requests")
      .select("id, status, user_id, pelada_id, peladas(id, name, organizer_id, starts_at, location_name)")
      .eq("id", data.requestId)
      .maybeSingle();
    if (!request) throw new Error("Solicitação não encontrada");
    const pelada = request.peladas as unknown as {
      id: string;
      name: string;
      organizer_id: string;
      starts_at: string;
      location_name: string;
    } | null;
    if (!pelada || pelada.organizer_id !== context.userId) throw new Error("Apenas o organizador pode responder");

    const { error } = await context.supabase
      .from("pelada_requests")
      .update({ status: data.status, responded_at: new Date().toISOString() })
      .eq("id", request.id);
    if (error) throw new Error(error.message);

    if (data.status === "accepted") {
      const { attemptSocialPush } = await import("@/lib/social-push.server");
      await attemptSocialPush(pelada.id);
    }

    const when = new Date(pelada.starts_at).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });

    const { notifyUser } = await import("@/lib/notifications.server");
    await notifyUser({
      userId: request.user_id,
      type: data.status === "accepted" ? "request_accepted" : "request_rejected",
      title: data.status === "accepted" ? "Pelada confirmada! ⚽" : "Solicitação recusada",
      body:
        data.status === "accepted"
          ? `Você está dentro da ${pelada.name} — ${when} em ${pelada.location_name}.`
          : `O organizador da ${pelada.name} não pôde confirmar sua vaga desta vez.`,
      url: `/pelada/${pelada.id}`,
      data: { peladaId: pelada.id, requestId: request.id },
      dedupeKey: `request:${request.id}:${data.status}`,
    });
    return { ok: true, status: data.status };
  });

/** Notifies the other chat participant about a new message. */
export const notifyChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { messageId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: message } = await context.supabase
      .from("chat_messages")
      .select("id, thread_id, sender_id, body, kind, chat_threads(id, organizer_id, player_id, pelada_id)")
      .eq("id", data.messageId)
      .maybeSingle();
    if (!message || message.sender_id !== context.userId) throw new Error("Mensagem não encontrada");
    const thread = message.chat_threads as unknown as {
      id: string;
      organizer_id: string;
      player_id: string;
      pelada_id: string;
    } | null;
    if (!thread) throw new Error("Conversa não encontrada");

    const recipient = thread.organizer_id === context.userId ? thread.player_id : thread.organizer_id;
    const { COPY } = await import("@/lib/notification-copy");
    const { notifyUser } = await import("@/lib/notifications.server");
    await notifyUser({
      userId: recipient,
      type: "chat_message",
      ...COPY.newMessage(),
      url: `/chat/${thread.id}`,
      data: { threadId: thread.id, peladaId: thread.pelada_id },
    });
    return { ok: true };
  });

/** Organizer invites a player to one of their upcoming matches. */
export const invitePlayerToPelada = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { peladaId: string; playerId: string }) => input)
  .handler(async ({ data, context }) => {
    if (data.playerId === context.userId) throw new Error("Você não pode convidar a si mesmo");
    const { data: blockedPair } = await context.supabase.rpc("is_blocked", { _a: context.userId, _b: data.playerId });
    if (blockedPair) throw new Error("Não é possível convidar este jogador");

    const { data: pelada } = await context.supabase
      .from("peladas")
      .select("id, name, organizer_id, starts_at, location_name, status")
      .eq("id", data.peladaId)
      .maybeSingle();
    if (!pelada || pelada.organizer_id !== context.userId) {
      throw new Error("Apenas o organizador pode enviar este convite");
    }
    if (pelada.status !== "open" || new Date(pelada.starts_at).getTime() <= Date.now()) {
      throw new Error("Esta pelada não está mais disponível");
    }

    const { data: organizer } = await context.supabase
      .from("profiles")
      .select("name")
      .eq("id", context.userId)
      .maybeSingle();
    const when = new Date(pelada.starts_at).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });

    const { notifyUser } = await import("@/lib/notifications.server");
    await notifyUser({
      userId: data.playerId,
      type: "pelada_invite",
      title: `${organizer?.name?.trim() || "Um jogador"} convidou você`,
      body: `${pelada.name} · ${when} em ${pelada.location_name}.`,
      url: `/pelada/${pelada.id}`,
      data: { peladaId: pelada.id, organizerId: context.userId },
      dedupeKey: `invite:${pelada.id}:${data.playerId}`,
    });
    return { ok: true };
  });

/** Opens (or reuses) the chat between the organizer and a player of a pelada. */
export const openChatThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { peladaId: string; otherUserId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: pelada } = await context.supabase
      .from("peladas")
      .select("id, organizer_id")
      .eq("id", data.peladaId)
      .maybeSingle();
    if (!pelada) throw new Error("Pelada não encontrada");

    const organizerId = pelada.organizer_id;
    const playerId = organizerId === context.userId ? data.otherUserId : context.userId;
    if (organizerId !== context.userId && data.otherUserId !== organizerId) {
      throw new Error("Conversa permitida apenas com o organizador");
    }
    const { data: member, error: membershipError } = await context.supabase.rpc("valid_member_thread", { _pelada_id: pelada.id, _organizer_id: organizerId, _player_id: playerId });
    if (membershipError || !member) throw new Error("O chat é liberado apenas para participantes confirmados da mesma pelada.");

    const { data: existing } = await context.supabase
      .from("chat_threads")
      .select("id")
      .eq("pelada_id", pelada.id)
      .eq("organizer_id", organizerId)
      .eq("player_id", playerId)
      .maybeSingle();
    if (existing) return { threadId: existing.id };

    const { data: created, error } = await context.supabase
      .from("chat_threads")
      .insert({ pelada_id: pelada.id, organizer_id: organizerId, player_id: playerId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { threadId: created.id };
  });

/** Organizer-only: alerts nearby players once a new open game is created. */
export const notifyNearbyPelada = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { peladaId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(input?.peladaId ?? "")) throw new Error("Jogo inválido");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: pelada } = await context.supabase
      .from("peladas")
      .select("id, organizer_id")
      .eq("id", data.peladaId)
      .maybeSingle();
    if (!pelada || pelada.organizer_id !== context.userId) throw new Error("Apenas o organizador pode avisar");
    const { notifyNearbyPeladaCreated } = await import("@/lib/nearby-notify.server");
    return { sent: await notifyNearbyPeladaCreated(pelada.id) };
  });
