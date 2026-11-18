import { createFileRoute } from "@tanstack/react-router";
import { AuthFlow } from "@/components/AuthFlow";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Entrar ou cadastrar | Futquick" },
    { name: "description", content: "Entre no Futquick ou crie sua conta para participar dos jogos." },
    { property: "og:title", content: "Entrar ou cadastrar | Futquick" },
    { property: "og:description", content: "Entre no Futquick ou crie sua conta para participar dos jogos." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AuthFlow,
});
