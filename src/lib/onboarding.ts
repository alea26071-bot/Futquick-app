/** Idade mínima para usar o Futquick. */
export const MIN_AGE = 13;
export const ONBOARDING_STEPS = 8;

export const NOTIFICATION_RADIUS_OPTIONS = [
  { label: "2 km", hint: "Só o que está no seu bairro", value: 2 },
  { label: "5 km", hint: "Sua região e vizinhança", value: 5 },
  { label: "10 km", hint: "Boa parte da sua cidade", value: 10 },
  { label: "Qualquer distância", hint: "Receber todas as peladas", value: null },
] as const;

export type OnboardingProfile = {
  name?: string | null;
  phone?: string | null;
  age?: number | null;
  city?: string | null;
  state?: string | null;
  notify_radius_km?: number | null;
  avatar_url?: string | null;
  onboarding_complete?: boolean;
};

export function isOnboardingComplete(profile: OnboardingProfile | null | undefined): boolean {
  return !!profile?.onboarding_complete &&
    !!profile.avatar_url &&
    !!profile.state &&
    (profile.city?.trim().length ?? 0) >= 2 &&
    (profile.name?.trim().length ?? 0) >= 2 &&
    typeof profile.age === "number" && profile.age >= MIN_AGE && profile.age <= 90 &&
    (profile.notify_radius_km === null || [2, 5, 10].includes(profile.notify_radius_km ?? -1));
}

/** Detecta contato pessoal (telefone, e-mail, @rede, endereço) em textos públicos. */
export function hasContactInfo(text: string): boolean {
  const t = text.toLowerCase();
  return /\d[\d\s().-]{7,}\d/.test(t) || /[a-z0-9_.+-]+@[a-z0-9.-]+\.[a-z]{2,}/.test(t) ||
    /(^|\s)@[a-z0-9_.]+/.test(t) || /\b(rua|avenida|av\.|travessa|apto|apartamento|cep|cpf|rg)\s/.test(t) ||
    /https?:\/\/|www\.|\b(instagram|whats|zap|tiktok|telegram|insta|facebook|discord)\b/.test(t);
}
