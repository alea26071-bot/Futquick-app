import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Futquick | Encontre seu próximo jogo" },
    { name: "description", content: "Encontre jogadores e organize partidas de futebol na sua região com Futquick." },
    { property: "og:title", content: "Futquick | Encontre seu próximo jogo" },
    { property: "og:description", content: "Conecte-se com jogadores e organize seu próximo jogo de futebol." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/descobrir" });
    throw redirect({ to: "/auth" });
  },
  component: () => null,
});
