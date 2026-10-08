import { test } from "node:test";
import assert from "node:assert/strict";
import { REGIONAL_GAME_TERMS, gameTermSchema } from "./game-term";

test("oferece Baba, Rachão, Pelada e Outro, sem duplicar Rachão", () => {
  assert.deepEqual([...REGIONAL_GAME_TERMS], ["Baba", "Rachão", "Pelada", "Outro"]);
});
test("aceita nome regional digitado em Outro", () => {
  assert.equal(gameTermSchema.parse("  Futebol de bairro  "), "Futebol de bairro");
  assert.equal(gameTermSchema.safeParse("").success, false);
});