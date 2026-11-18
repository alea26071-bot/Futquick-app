import { test } from "node:test";
import assert from "node:assert/strict";
import { photoQualityFor } from "./photo-quality";

test("capas preservam resolução de até 2048 px com qualidade JPEG de 92%", () => {
  assert.deepEqual(photoQualityFor("avatars", "cover-photo"), { maxDimension: 2048, quality: 0.92 });
});
test("foto circular mantém até 1024 px com qualidade de 90%", () => {
  assert.deepEqual(photoQualityFor("avatars", "avatar"), { maxDimension: 1024, quality: 0.9 });
});
test("fotos de outras telas mantêm a configuração anterior", () => {
  for (const bucket of ["peladas", "chat"] as const) {
    assert.deepEqual(photoQualityFor(bucket), { maxDimension: 1200, quality: 0.85 });
  }
});