import { test, expect } from "bun:test";
import { REGIONAL_GAME_TERMS, gameTermSchema } from "./game-term";

test("oferece Baba, Rachão, Pelada e Outro, sem duplicar Rachão", () => {
  expect([...REGIONAL_GAME_TERMS]).toEqual(["Baba", "Rachão", "Pelada", "Outro"]);
});
test("aceita nome regional digitado em Outro", () => {
  expect(gameTermSchema.parse("  Futebol de bairro  ")).toBe("Futebol de bairro");
  expect(gameTermSchema.safeParse("").success).toBe(false);
});