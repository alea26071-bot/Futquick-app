import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

type Shown = { title: string; options: Record<string, unknown> };

function push(payload: unknown): Shown {
  const listeners: Record<string, (e: unknown) => void> = {};
  const shown: Shown[] = [];
  const self = {
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
  const src = readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8");
  new Function("self", src)(self);
  listeners["push"]?.({ data: { json: () => payload, text: () => "" }, waitUntil: () => undefined });
  const first = shown[0];
  if (!first) throw new Error("nenhuma notificação exibida");
  return first;
}

test("exibe com som padrão, re-alerta e não prende na tela", () => {
  const n = push({ title: "Oi", body: "b", url: "/chat/1", tag: "chat_message" });
  assert.equal(n.options["silent"], false);
  assert.equal(n.options["renotify"], true);
  assert.equal(n.options["requireInteraction"], false);
  assert.equal(typeof n.options["timestamp"], "number");
  assert.deepEqual(n.options["data"], { url: "/chat/1" });
});

test("avisos do mesmo tipo para destinos diferentes não se sobrescrevem", () => {
  const a = push({ tag: "chat_message", url: "/chat/1" });
  const b = push({ tag: "chat_message", url: "/chat/2" });
  assert.notEqual(a.options["tag"], b.options["tag"]);
});
