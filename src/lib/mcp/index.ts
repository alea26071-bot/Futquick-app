import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listOpenGames from "./tools/list-open-games";
import getGame from "./tools/get-game";
import myOrganizedGames from "./tools/my-organized-games";
import myProfile from "./tools/my-profile";

// Vite inlines the stable ref; the published SUPABASE_URL may be a proxy.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "futquick",
  title: "Futquick",
  version: "0.1.0",
  instructions: "Tools for Futquick, a marketplace of pickup games. Find open games, see game details, and read the signed-in user's profile and organized games.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listOpenGames, getGame, myOrganizedGames, myProfile],
});
