import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ChatMessagePopup } from "@/components/ChatMessagePopup";
import { GameTermProvider } from "@/components/GameTermProvider";
import { isOnboardingComplete } from "@/lib/onboarding";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    // Fotos vindas do Google não substituem a conclusão do cadastro.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("name, age, city, state, notify_radius_km, onboarding_complete, avatar_url, game_term")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!isOnboardingComplete(profile)) throw redirect({ to: "/onboarding" });
    return { user: data.user, gameTerm: profile?.game_term ?? null };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, gameTerm } = Route.useRouteContext();
  return (
    <GameTermProvider key={user.id} userId={user.id} initialTerm={gameTerm}>
      <ChatMessagePopup userId={user.id} />
      <Outlet />
    </GameTermProvider>
  );
}
