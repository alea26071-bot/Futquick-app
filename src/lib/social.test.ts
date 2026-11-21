import { test } from "node:test";
import assert from "node:assert/strict";
import { socialListInput } from "./social";
import { distanceKm, effectiveRadiusKm } from "./notification-copy";

const id = "45048d71-5d68-4dd9-8499-b267823171be";
test("listas sociais permitem seguidores, seguindo e apenas conhecidos em comum", () => {
  for (const mode of ["followers", "following", "mutual"]) assert.equal(socialListInput.parse({ profileId: id, mode }).mode, mode);
  assert.equal(socialListInput.safeParse({ profileId: id, mode: "all-private-users" }).success, false);
});
test("paginação social não aceita posições negativas e busca é limitada", () => {
  assert.equal(socialListInput.parse({ profileId: id, mode: "followers" }).offset, 0);
  assert.equal(socialListInput.safeParse({ profileId: id, mode: "followers", offset: -1 }).success, false);
  assert.equal(socialListInput.safeParse({ profileId: id, mode: "followers", search: "a".repeat(81) }).success, false);
});
test("atividade social respeita raio escolhido sem ultrapassar os 5 km existentes", () => {
  assert.equal(effectiveRadiusKm(2), 2);
  assert.equal(effectiveRadiusKm(10), 5);
  assert.equal(effectiveRadiusKm(null), 5);
  assert.ok(distanceKm(0, 0, 0, 0.018) > effectiveRadiusKm(1));
  assert.ok(distanceKm(0, 0, 0, 0.018) < effectiveRadiusKm(3));
});