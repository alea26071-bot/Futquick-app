import { test } from "node:test";
import assert from "node:assert/strict";
import { canFinishWithLegal, isLegalDraft, isLegalTestEnvironment, TERMS_VERSION, PRIVACY_VERSION } from "./legal";

const ok = { accepted: true, termsViewed: true, privacyViewed: true, draft: false, testEnv: false };
test("versões iniciais 1.0", () => { assert.equal(TERMS_VERSION, "1.0"); assert.equal(PRIVACY_VERSION, "1.0"); });
test("exige checkbox marcado", () => assert.equal(canFinishWithLegal({ ...ok, accepted: false }), false));
test("exige abrir os dois documentos", () => {
  assert.equal(canFinishWithLegal({ ...ok, termsViewed: false }), false);
  assert.equal(canFinishWithLegal({ ...ok, privacyViewed: false }), false);
});
test("rascunho bloqueia produção e libera preview", () => {
  assert.equal(canFinishWithLegal({ ...ok, draft: true }), false);
  assert.equal(canFinishWithLegal({ ...ok, draft: true, testEnv: true }), true);
});
test("rascunho enquanto houver pendência", () => {
  assert.equal(isLegalDraft(), true);
  assert.equal(isLegalDraft({ responsibleNamesFilled: true, privacyEmailFilled: true, minorsPolicyConfirmed: false }), true);
  assert.equal(isLegalDraft({ responsibleNamesFilled: true, privacyEmailFilled: true, minorsPolicyConfirmed: true }), false);
});
test("ambientes", () => {
  assert.equal(isLegalTestEnvironment("futquick-app.lovable.app"), false);
  assert.equal(isLegalTestEnvironment("id-preview--abc.lovable.app"), true);
  assert.equal(isLegalTestEnvironment("localhost"), true);
});
