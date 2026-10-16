import { test } from "node:test";
import assert from "node:assert/strict";
import { FOOTBALL_MODALITIES, OTHER_MODALITIES, buildGameImagePrompt, isGameModality } from "./game-modalities";
import { maxSlotsFor } from "./pelada-utils";

test("mantém Futsal, Society e Campo antes das modalidades de Outro", () => {
  assert.deepEqual(FOOTBALL_MODALITIES.map((m) => m.id), ["futsal", "society", "campo"]);
  assert.deepEqual(OTHER_MODALITIES.map((m) => m.id), ["basquete", "volei", "futvolei", "beach_tenis", "tenis", "corrida", "pedal"]);
  assert.equal(isGameModality("outro"), false);
});

const subjects = [
  ["basquete", "basketball hoops"], ["volei", "volleyball net"],
  ["futvolei", "footvolley"], ["beach_tenis", "beach tennis paddles"],
  ["tenis", "stringed tennis rackets"], ["corrida", "runners jogging"], ["pedal", "cyclists riding bicycles"],
];
for (const [sport, subject] of subjects) {
  test(`capa de ${sport} representa a modalidade escolhida`, () => {
    const prompt = buildGameImagePrompt({ peladaName: "Encontro", fieldType: sport });
    assert.ok(prompt.includes(subject));
    assert.equal(prompt.includes("soccer"), false);
  });
}

for (const [sport, limit] of [["campo", 30], ["society", 21], ["futsal", 16]] as const) {
  test(`preserva limite de ${limit} para ${sport}`, () => assert.equal(maxSlotsFor(sport), limit));
}