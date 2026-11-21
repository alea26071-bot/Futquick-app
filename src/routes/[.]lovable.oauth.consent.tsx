import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type OAuthResult = { data: { redirect_url?: string; redirect_to?: string; client?: { name?: string; redirect_uri?: string } ; scope?: string } | null; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Conectar assistente | Futquick" },
    { name: "description", content: "Autorize um assistente a usar sua conta Futquick." },
    { property: "og:title", content: "Conectar assistente | Futquick" },
    { property: "og:description", content: "Autorize um assistente a usar sua conta Futquick." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Pedido de autorização inválido ou ausente.");
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth", search: { next: location.pathname + location.searchStr } });
  },
  loaderDeps: ({ search }) => ({ id: search.authorization_id }),
  loader: async ({ deps }) => {
    const { data, error } = await oauth().getAuthorizationDetails(deps.id);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    const { data: u } = await supabase.auth.getUser();
    return { details: data, email: u.user?.email ?? "" };
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md p-6 text-center">
      <h1 className="text-xl font-bold">Não foi possível carregar a autorização</h1>
      <p className="mt-2 text-muted-foreground">{error instanceof Error ? error.message : String(error)}</p>
    </main>
  ),
});

function Consent() {
  const { details } = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = details?.client?.name ?? "Um assistente";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) { setBusy(false); setError(error.message); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setError("O servidor não retornou um endereço de retorno."); return; }
    window.location.href = target;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-bold">Conectar {client} ao Futquick</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {client} poderá consultar jogos abertos e os dados da sua conta usando o Futquick como você.
        </p>
        {details?.client?.redirect_uri && (
          <p className="mt-2 break-all text-xs text-muted-foreground">Retorno: {details.client.redirect_uri}</p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">Isso não ignora as permissões do app.</p>
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        <div className="mt-5 flex gap-2">
          <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>Permitir</Button>
          <Button className="flex-1" variant="outline" disabled={busy} onClick={() => decide(false)}>Cancelar conexão</Button>
        </div>
      </div>
    </main>
  );
}
