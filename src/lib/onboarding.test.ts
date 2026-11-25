import { test } from "node:test";
import assert from "node:assert/strict";
import { isOnboardingComplete, ONBOARDING_STEPS, NOTIFICATION_RADIUS_OPTIONS } from "./onboarding";

const complete = {
  onboarding_complete: true, name: "Jogador", age: 25,
  city: "Natal", state: "RN", notify_radius_km: 5,
  avatar_url: "avatars/user/photo.jpg",
};

test("cadastro tem oito etapas", () => assert.equal(ONBOARDING_STEPS, 8));
test("foto é obrigatória mesmo quando a conta está marcada como completa", () => {
  assert.equal(isOnboardingComplete({ ...complete, avatar_url: null }), false);
});
test("região exige estado e cidade", () => {
  assert.equal(isOnboardingComplete({ ...complete, state: null }), false);
  assert.equal(isOnboardingComplete({ ...complete, city: null }), false);
});
test("raios são 2, 5, 10 km ou qualquer distância", () => {
  assert.deepEqual(NOTIFICATION_RADIUS_OPTIONS.map((option) => option.value), [2, 5, 10, null]);
  for (const radius of [2, 5, 10, null]) {
    assert.equal(isOnboardingComplete({ ...complete, notify_radius_km: radius }), true);
  }
  assert.equal(isOnboardingComplete({ ...complete, notify_radius_km: 3 }), false);
});
test("foto do Google não substitui a conclusão das sete etapas", () => {
  assert.equal(isOnboardingComplete({ ...complete, onboarding_complete: false }), false);
});
test("perfil completo não precisa refazer o cadastro ao entrar novamente", () => {
  assert.equal(isOnboardingComplete(complete), true);
});
test("idade mínima de 13 anos", () => {
  assert.equal(isOnboardingComplete({ ...complete, age: 12 }), false);
  assert.equal(isOnboardingComplete({ ...complete, age: 13 }), true);
});
test("detecta contato na biografia", async () => {
  const { hasContactInfo } = await import("./onboarding");
  assert.equal(hasContactInfo("me chama no 11 98888-7777"), true);
  assert.equal(hasContactInfo("Zagueiro raçudo"), false);
});
