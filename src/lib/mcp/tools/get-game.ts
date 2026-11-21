import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_game",
  title: "Ver detalhes do jogo",
  description: "Get the details of one game (pelada) by its id.",
  inputSchema: { id: z.string().uuid().describe("Game id returned by list_open_games.") },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("peladas")
      .select("id, name, description, starts_at, duration_minutes, location_name, address, city, field_type, level, price_cents, total_slots, filled_slots, status, group_mode, auto_approve, waitlist_enabled")
      .eq("id", id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Game not found" }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { game: data } };
  },
});
