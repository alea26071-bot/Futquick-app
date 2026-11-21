import { createFileRoute } from "@tanstack/react-router";
import { AuthFlow } from "@/components/AuthFlow";
import { rememberReturnPath } from "@/lib/oauth-return-path";

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
  validateSearch: (s: Record<string, unknown>): { next?: string } =>
    typeof s["next"] === "string" ? { next: s["next"] } : {},
  beforeLoad: ({ search }) => {
    if (search.next) rememberReturnPath(search.next);
  },
  component: () => <AuthFlow />,
});
