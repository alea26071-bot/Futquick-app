import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AuthFlow } from "@/components/AuthFlow";
import { isOnboardingComplete } from "@/lib/onboarding";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Complete seu cadastro | Futquick" },
    { name: "description", content: "Complete seu perfil de jogador no Futquick." },
    { property: "og:title", content: "Complete seu cadastro | Futquick" },
    { property: "og:description", content: "Complete seu perfil de jogador no Futquick." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: profile, error } = await supabase.from("profiles")
      .select("name, phone, age, city, state, notify_radius_km, avatar_url, onboarding_complete")
      .eq("id", data.user.id).maybeSingle();
    if (error) throw error;
    if (isOnboardingComplete(profile)) throw redirect({ to: "/descobrir" });
    return { user: data.user, profile };
  },
  component: OnboardingPage,
});

function OnboardingPage() {
  const { user, profile } = Route.useRouteContext();
  return <AuthFlow user={user} profile={profile} />;
}
