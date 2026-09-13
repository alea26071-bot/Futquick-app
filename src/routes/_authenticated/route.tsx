import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ChatMessagePopup } from "@/components/ChatMessagePopup";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    // Foto de perfil é obrigatória para usar o app.
    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", data.user.id)
      .maybeSingle();
    if (!profile?.avatar_url) throw redirect({ to: "/onboarding" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  return (
    <>
      <ChatMessagePopup userId={user.id} />
      <Outlet />
    </>
  );
}
