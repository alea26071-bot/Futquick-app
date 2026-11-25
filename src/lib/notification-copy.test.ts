import { test } from "node:test";
import assert from "node:assert/strict";
import { distanceKm, effectiveRadiusKm } from "./notification-copy";

test("raio de aviso respeita a escolha", () => {
  assert.equal(effectiveRadiusKm(10), 10);
  assert.equal(effectiveRadiusKm(2), 2);
  assert.equal(effectiveRadiusKm(null), 25);
});

test("pelada a ~4 km entra, a ~7 km fica de fora", () => {
  const base = [-3.73, -38.52] as const; // Fortaleza
  assert.ok(distanceKm(base[0], base[1], base[0] + 0.036, base[1]) < 5);
  assert.ok(distanceKm(base[0], base[1], base[0] + 0.063, base[1]) > 5);
});

import { COPY, saoPauloDayStart } from "./notification-copy";

test("aviso de mensagem é genérico, sem conteúdo", () => {
  assert.equal(COPY.newMessage().title, "Você tem uma nova mensagem");
  assert.equal(COPY.newMessage().body, "Toque para abrir a conversa.");
});

test("lembrete diário usa o dia de Brasília", () => {
  const r = saoPauloDayStart(new Date("2026-11-22T02:00:00Z"));
  assert.equal(r.day, "2026-11-21");
  assert.equal(r.startIso, "2026-11-21T03:00:00.000Z");
});

test("raio escolhido 2/5/10 é respeitado e qualquer distância usa teto de 25 km", () => {
  assert.equal(effectiveRadiusKm(5), 5);
  assert.equal(effectiveRadiusKm(10), 10);
  assert.equal(effectiveRadiusKm(null), 25);
});
