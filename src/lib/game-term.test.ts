import { test } from "node:test";
import assert from "node:assert/strict";
import { REGIONAL_GAME_TERMS, gameTermSchema, gameListLabels } from "./game-term";

test("oferece Baba, Rachão, Pelada e Outro, sem duplicar Rachão", () => {
  assert.deepEqual([...REGIONAL_GAME_TERMS], ["Baba", "Rachão", "Pelada", "Outro"]);
});
test("aceita nome regional digitado em Outro", () => {
  assert.equal(gameTermSchema.parse("  Futebol de bairro  "), "Futebol de bairro");
  assert.equal(gameTermSchema.safeParse("").success, false);
});
test('personaliza títulos de jogos ativos e fixos', () => {
  assert.equal(gameListLabels('Pelada').active, 'Peladas ativas');
  assert.equal(gameListLabels('Pelada').fixed, 'Peladas fixas');
  assert.equal(gameListLabels('Rachão').active, 'Rachões ativos');
  assert.equal(gameListLabels('Baba').fixed, 'Babas fixas');
});