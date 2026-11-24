import { test } from "node:test";
import assert from "node:assert/strict";
import { describeSaveError } from "./save-error";

test("telefone duplicado", () => assert.match(describeSaveError({ code: "23505", message: 'violates unique constraint "profiles_phone_unique"' }, "profile"), /telefone já está ligado/));
test("sessão expirada", () => assert.match(describeSaveError({ code: "42501", message: "permission denied" }, "acceptance"), /sessão expirou/));
test("aceite ausente na trigger", () => assert.match(describeSaveError({ code: "P0001", message: "Aceite dos Termos ... obrigatório" }, "profile"), /aceite/));
test("código desconhecido aparece", () => assert.match(describeSaveError({ code: "XX000", message: "boom" }, "profile"), /código XX000/));
test("sem conexão", () => assert.match(describeSaveError(new TypeError("Failed to fetch"), "profile"), /conexão/));
