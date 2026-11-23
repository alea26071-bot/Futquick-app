import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { nativePushConfigured, sendNativePush } from "@/lib/fcm.server";
import type { PushMessage } from "@/lib/web-push.server";

/** Delivers to every native device of a user. Stale tokens are removed. `skip` holds device keys already reached. */
export async function sendToNativeDevices(
  userId: string,
  message: PushMessage,
  skip?: Set<string>,
) {
  const result = { delivered: 0, retry: false, reached: [] as string[] };
  if (!nativePushConfigured()) return result;
  const { data: devices, error } = await supabaseAdmin
    .from("push_devices")
    .select("token, platform")
    .eq("user_id", userId);
  if (error) {
    result.retry = true;
    return result;
  }
  for (const d of devices ?? []) {
    const key = `fcm:${d.token.slice(-32)}`;
    if (skip?.has(key)) continue;
    const r = await sendNativePush(d.token, d.platform, message);
    if (r === "ok") {
      result.delivered++;
      result.reached.push(key);
    }
    if (r === "error") result.retry = true;
    if (r === "gone")
      await supabaseAdmin.from("push_devices").delete().eq("token", d.token).eq("user_id", userId);
  }
  return result;
}
