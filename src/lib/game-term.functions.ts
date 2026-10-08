import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { gameTermSchema } from "@/lib/game-term";

export const saveGameTerm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    term: gameTermSchema,
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("profiles").update({ game_term: data.term }).eq("id", context.userId);
    if (error) throw new Error("Não foi possível salvar sua preferência. Tente novamente.");
    return { term: data.term };
  });