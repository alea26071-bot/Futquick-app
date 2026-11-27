import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";
import type { Database } from "@/integrations/supabase/types";

export default defineTool({
  name: "get_my_profile",
  title: "Meu perfil",
  description: "Get the signed-in user's Futquick profile (name, city, level and posture averages).",
  inputSchema: {},
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const userId = ctx.getUserId();
    if (!ctx.isAuthenticated() || !userId) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await supabaseForUser(ctx).rpc("my_profile")
      .returns<Database["public"]["Functions"]["my_profile"]["Returns"]>().maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Profile not found" }], isError: true };
    const profile = { id: data.id, name: data.name, city: data.city, state: data.state, stars_average: data.stars_average, posture_average: data.posture_average, peladas_played: data.peladas_played };
    return { content: [{ type: "text", text: JSON.stringify(profile) }], structuredContent: { profile } };
  },
});
