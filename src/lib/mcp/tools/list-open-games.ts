import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_open_games",
  title: "Listar jogos abertos",
  description: "List upcoming open games (peladas) with free slots, optionally filtered by city or sport style.",
  inputSchema: {
    city: z.string().min(1).optional().describe("City name to filter by, e.g. São Paulo."),
    field_type: z.string().min(1).optional().describe("Sport/style id, e.g. campo, society, futsal, basquete, volei."),
    limit: z.number().int().min(1).max(50).optional().describe("Max games to return (default 20)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ city, field_type, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("peladas")
      .select("id, name, starts_at, duration_minutes, location_name, address, city, field_type, level, price_cents, total_slots, filled_slots, status")
      .eq("status", "open")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(limit ?? 20);
    if (city) q = q.ilike("city", city);
    if (field_type) q = q.eq("field_type", field_type);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const games = (data ?? []).map((g) => ({ ...g, free_slots: Math.max(0, g.total_slots - g.filled_slots) }));
    return { content: [{ type: "text", text: JSON.stringify(games) }], structuredContent: { games } };
  },
});
