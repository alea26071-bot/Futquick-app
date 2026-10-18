import { test } from "node:test";
import assert from "node:assert/strict";
import { distanceKm, effectiveRadiusKm } from "./notification-copy";

test("raio máximo de aviso é 5 km", () => {
  assert.equal(effectiveRadiusKm(10), 5);
  assert.equal(effectiveRadiusKm(2), 2);
  assert.equal(effectiveRadiusKm(null), 5);
});

test("pelada a ~4 km entra, a ~7 km fica de fora", () => {
  const base = [-3.73, -38.52] as const; // Fortaleza
  assert.ok(distanceKm(base[0], base[1], base[0] + 0.036, base[1]) < 5);
  assert.ok(distanceKm(base[0], base[1], base[0] + 0.063, base[1]) > 5);
});
