export const ONBOARDING_STEPS = 7;

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
    typeof profile.age === "number" && profile.age >= 8 && profile.age <= 90 &&
    (profile.notify_radius_km === null || [2, 5, 10].includes(profile.notify_radius_km ?? -1));
}