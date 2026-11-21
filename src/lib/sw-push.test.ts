import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadSw() {
  const listeners: Record<string, (e: unknown) => void> = {};
  const shown: Array<{ title: string; options: Record<string, unknown> }> = [];
  const self: Record<string, unknown> = {
    addEventListener: (n: string, f: (e: unknown) => void) => (listeners[n] = f),
    skipWaiting: () => undefined,
    clients: { claim: () => Promise.resolve() },
    registration: {
      showNotification: (title: string, options: Record<string, unknown>) => {
        shown.push({ title, options });
        return Promise.resolve();
      },
    },
  };
  const src = readFileSync(resolve(__dirname, "../../public/sw.js"), "utf8");
  new Function("self", src)(self);
  return { listeners, shown };
}

function push(payload: unknown) {
  const sw = loadSw();
  sw.listeners["push"]!({ data: { json: () => payload, text: () => "" }, waitUntil: () => undefined });
  return sw.shown[0]!;
}

describe("service worker push", () => {
  it("exibe com som padrão, re-alerta e não prende na tela", () => {
    const n = push({ title: "Oi", body: "b", url: "/chat/1", tag: "chat_message" });
    expect(n.options["silent"]).toBe(false);
    expect(n.options["renotify"]).toBe(true);
    expect(n.options["requireInteraction"]).toBe(false);
    expect(typeof n.options["timestamp"]).toBe("number");
    expect(n.options["data"]).toEqual({ url: "/chat/1" });
  });
  it("avisos do mesmo tipo para destinos diferentes não se sobrescrevem", () => {
    const a = push({ tag: "chat_message", url: "/chat/1" });
    const b = push({ tag: "chat_message", url: "/chat/2" });
    expect(a.options["tag"]).not.toBe(b.options["tag"]);
  });
});
