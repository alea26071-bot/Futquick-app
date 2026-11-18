import { test } from "node:test";
import assert from "node:assert/strict";
import { validateProfileCoverPaths, moveCoverPhoto, validateCoverSelection } from "./profile-cover";

test("permite zero, uma, duas ou três fotos", () => {
  for (let count = 0; count <= 3; count++) {
    const paths = Array.from({ length: count }, (_, i) => `owner/cover-${i}.jpg`);
    assert.deepEqual(validateProfileCoverPaths(paths, "owner"), paths);
  }
});
test("recusa quatro fotos", () => {
  assert.throws(() => validateProfileCoverPaths([0, 1, 2, 3].map(i => `owner/cover-${i}.jpg`), "owner"));
});
test("recusa fotos de outro usuário", () => {
  assert.throws(() => validateProfileCoverPaths(["other/cover-1.jpg"], "owner"));
});
test("recusa caminhos inválidos ou repetidos", () => {
  for (const paths of [["owner/cover-../file"], ["owner/avatar.jpg"], ["owner/cover-1.jpg", "owner/cover-1.jpg"]]) {
    assert.throws(() => validateProfileCoverPaths(paths, "owner"));
  }
});
test("reorganização preserva todas as fotos e a ordem escolhida", () => {
  assert.deepEqual(moveCoverPhoto(["a", "b", "c"], 2, -1), ["a", "c", "b"]);
  assert.deepEqual(moveCoverPhoto(["a", "b"], 0, 1), ["b", "a"]);
});

test("permite selecionar três fotos juntas em perfil vazio mantendo a ordem", () => {
  const files = ["a", "b", "c"].map(name => ({ name, type: "image/jpeg" }));
  assert.deepEqual(validateCoverSelection(files, 0, null), files);
});
test("limita seleção às posições livres sem descartar fotos silenciosamente", () => {
  const file = { type: "image/jpeg" };
  assert.deepEqual(validateCoverSelection([file, file], 1, null), [file, file]);
  assert.throws(() => validateCoverSelection([file, file], 2, null));
  assert.throws(() => validateCoverSelection([file, file, file, file], 0, null));
});
test("substituição aceita somente uma foto", () => {
  const file = { type: "image/png" };
  assert.deepEqual(validateCoverSelection([file], 3, 1), [file]);
  assert.throws(() => validateCoverSelection([file, file], 3, 1));
});
test("recusa lote com arquivo que não seja imagem", () => {
  assert.throws(() => validateCoverSelection([{ type: "image/jpeg" }, { type: "application/pdf" }], 0, null));
});