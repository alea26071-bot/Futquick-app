import { test } from "node:test";
import assert from "node:assert/strict";
import { validateProfileCoverPaths, moveCoverPhoto } from "./profile-cover";

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