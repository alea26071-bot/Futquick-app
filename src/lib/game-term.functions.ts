import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const saveGameTerm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    term: z.string().trim().min(2, "Digite pelo menos 2 caracteres").max(30, "Use até 30 caracteres").regex(/^[^\p{Cc}<>]+$/u, "Nome inválido"),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("profiles").update({ game_term: data.term }).eq("id", context.userId);
    if (error) throw new Error("Não foi possível salvar sua preferência. Tente novamente.");
    return { term: data.term };
  });