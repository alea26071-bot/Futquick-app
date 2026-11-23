import { describe, test } from "node:test";
import assert from "node:assert/strict";
const expect = (v: unknown) => ({ toBe: (e: unknown) => assert.equal(v, e) });
import { buildFcmMessage } from "@/lib/fcm.server";
import { safeAppPath } from "@/lib/native/platform";
import { ADMOB_TEST_BANNER } from "@/lib/native/ads";

describe("push nativo", () => {
  test("Android usa canal de alta prioridade com som padrão", () => {
    const m = buildFcmMessage("tok", "android", {
      title: "Nova mensagem",
      url: "/chat/1",
      tag: "chat-1",
    }).message as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(m.android.priority).toBe("HIGH");
    expect(m.android.notification.channel_id).toBe("futquick_default");
    expect(m.android.notification.default_sound).toBe(true);
    expect(m.data.url).toBe("/chat/1");
  });

  test("iOS usa APNs com som padrão e agrupamento pela tag", () => {
    const m = buildFcmMessage("tok", "ios", { title: "Oi", tag: "pelada-9" })
      .message as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(m.apns.payload.aps.sound).toBe("default");
    expect(m.apns.headers["apns-collapse-id"]).toBe("pelada-9");
  });

  test("destino externo no push nunca sai do app", () => {
    expect(
      buildFcmMessage("tok", "android", { title: "x", url: "https://evil.com" }).message.data.url,
    ).toBe("/notificacoes");
    expect(safeAppPath("https://evil.com/pelada/1")).toBe("/notificacoes");
    expect(safeAppPath("//evil.com")).toBe("/notificacoes");
    expect(safeAppPath("https://futquick-app.lovable.app/pelada/1")).toBe("/pelada/1");
    expect(safeAppPath("/chat/abc")).toBe("/chat/abc");
  });

  test("anúncios usam somente IDs oficiais de teste do Google", () => {
    expect(ADMOB_TEST_BANNER.android).toBe("ca-app-pub-3940256099942544/6300978111");
    expect(ADMOB_TEST_BANNER.ios).toBe("ca-app-pub-3940256099942544/2934735716");
  });
});
