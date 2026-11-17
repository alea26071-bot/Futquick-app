import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireAdminRole } from "./admin-authorization.server";

function client(data: unknown, error: unknown = null) {
  return {
    rpc: async (name: string, args: unknown) => {
      assert.equal(name, "has_role");
      assert.deepEqual(args, { _user_id: "authenticated-user", _role: "admin" });
      return { data, error };
    },
  } as unknown as SupabaseClient<Database>;
}

test("permite administrador com papel confirmado no banco", async () => {
  await assert.doesNotReject(requireAdminRole(client(true), "authenticated-user"));
});
test("nega usuário comum mesmo com sessão autenticada", async () => {
  await assert.rejects(requireAdminRole(client(false), "authenticated-user"), /Acesso restrito/);
});
test("nega acesso quando a consulta de permissões falha", async () => {
  await assert.rejects(requireAdminRole(client(true, { message: "private provider details" }), "authenticated-user"), { message: "Acesso restrito ao administrador" });
});
test("nega acesso sem confirmação explícita do papel", async () => {
  await assert.rejects(requireAdminRole(client(null), "authenticated-user"), /Acesso restrito/);
});