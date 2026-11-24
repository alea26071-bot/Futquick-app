import { test } from "node:test";
import assert from "node:assert/strict";
import { canFinishWithLegal, isLegalDraft, isLegalTestEnvironment, TERMS_VERSION, PRIVACY_VERSION, RESPONSIBLE_1, RESPONSIBLE_2, PRIVACY_EMAIL, LEGAL_PENDING } from "./legal";

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
  assert.equal(isLegalDraft({ responsibleNamesFilled: true, privacyEmailFilled: true, legalTextsReviewed: true, minorsPolicyConfirmed: false }), true);
  assert.equal(isLegalDraft({ responsibleNamesFilled: true, privacyEmailFilled: true, legalTextsReviewed: false, minorsPolicyConfirmed: true }), true);
  assert.equal(isLegalDraft({ responsibleNamesFilled: true, privacyEmailFilled: true, legalTextsReviewed: true, minorsPolicyConfirmed: true }), false);
});
test("responsáveis e e-mail confirmados, menores pendente", () => {
  assert.equal(RESPONSIBLE_1, "Eugenio Gomes Teixeira Filho");
  assert.equal(RESPONSIBLE_2, "Pedro Augusto de Souza Duarte");
  assert.equal(PRIVACY_EMAIL, "futquick.oficial@gmail.com");
  assert.equal(LEGAL_PENDING.minorsPolicyConfirmed, false);
});
test("ambientes", () => {
  assert.equal(isLegalTestEnvironment("futquick-app.lovable.app"), false);
  assert.equal(isLegalTestEnvironment("id-preview--abc.lovable.app"), true);
  assert.equal(isLegalTestEnvironment("localhost"), true);
});
