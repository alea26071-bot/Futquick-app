import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendWebPush } from "@/lib/web-push.server";
import { sendToNativeDevices } from "@/lib/native-devices.server";

export type NotifyInput = {
  userId: string;
  type: string;
  title: string;
  body?: string;
  url?: string;
  data?: Record<string, unknown>;
  /** When set, the same notification is never delivered twice. */
  dedupeKey?: string;
};

/** Persists an in-app notification and delivers a web push to every device of that user. */
export async function notifyUser(input: NotifyInput): Promise<{ delivered: number; skipped?: boolean }> {
  if (input.dedupeKey) {
    const { data: existing } = await supabaseAdmin
      .from("notifications")
      .select("id")
      .eq("user_id", input.userId)
      .eq("dedupe_key", input.dedupeKey)
      .maybeSingle();
    if (existing) return { delivered: 0, skipped: true };
  }

  const { error } = await supabaseAdmin.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    url: input.url ?? null,
    data: (input.data ?? {}) as never,
    dedupe_key: input.dedupeKey ?? null,
  });
  if (error) console.error("[notify] insert failed", error.message);

  // Respeita "Silenciar notificações" por pelada: registra no app, mas não envia push.
  const peladaId = typeof input.data?.peladaId === "string" ? input.data.peladaId : null;
  if (peladaId) {
    const { data: muted } = await supabaseAdmin
      .from("pelada_mutes")
      .select("pelada_id")
      .eq("pelada_id", peladaId)
      .eq("user_id", input.userId)
      .maybeSingle();
    if (muted) return { delivered: 0, skipped: true };
  }

  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", input.userId);

  let delivered = 0;
  for (const sub of subs ?? []) {
    const result = await sendWebPush(sub, {
      title: input.title,
      body: input.body,
      url: input.url,
      tag: input.dedupeKey ?? input.type,
    });
    if (result === "ok") delivered++;
    if (result === "gone") {
      await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    }
  }
  // Native app devices (Android/iOS). The app's WebView never holds a web subscription, so no device gets both.
  const native = await sendToNativeDevices(input.userId, {
    title: input.title,
    body: input.body,
    url: input.url,
    tag: input.dedupeKey ?? input.type,
  });
  delivered += native.delivered;
  return { delivered };
}
