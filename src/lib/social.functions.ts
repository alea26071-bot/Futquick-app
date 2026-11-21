import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { socialListInput, socialPage } from "@/lib/social";

export const getSocialList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => socialListInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: page, error } = await context.supabase.rpc("social_profile_list", { _profile_id: data.profileId, _mode: data.mode, _search: data.search, _offset: data.offset });
    if (error) throw new Error("Não foi possível carregar os seguidores.");
    return socialPage.parse(page);
  });

export const getSocialSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ profileId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const pages = await Promise.all((["followers", "following", "mutual"] as const).map(async (mode) => {
      const { data: page, error } = await context.supabase.rpc("social_profile_list", { _profile_id: data.profileId, _mode: mode });
      if (error) throw new Error("Não foi possível carregar os relacionamentos.");
      return socialPage.parse(page);
    }));
    const [followers, following, mutual] = pages;
    if (!followers || !following || !mutual) throw new Error("Relacionamentos indisponíveis.");
    return { followers: followers.total, following: following.total, mutual: { total: mutual.total, names: mutual.items.slice(0, 2).map((p) => p.name) } };
  });

export const setFollow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ targetId: z.string().uuid(), following: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.targetId === context.userId) throw new Error("Você não pode seguir a si mesmo.");
    const result = data.following
      ? await context.supabase.from("user_follows").upsert({ follower_id: context.userId, following_id: data.targetId }, { onConflict: "follower_id,following_id", ignoreDuplicates: true })
      : await context.supabase.from("user_follows").delete().eq("follower_id", context.userId).eq("following_id", data.targetId);
    if (result.error) throw new Error("Não foi possível atualizar este relacionamento.");
    return { following: data.following };
  });

export const setFollowActivityPreference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ enabled: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("profiles").update({ notify_follow_activity: data.enabled }).eq("id", context.userId);
    if (error) throw new Error("Não foi possível salvar a preferência.");
    return { enabled: data.enabled };
  });