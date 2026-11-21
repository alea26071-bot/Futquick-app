import { z } from "zod";

export const socialMode = z.enum(["followers", "following", "mutual"]);
export type SocialMode = z.infer<typeof socialMode>;
export const socialListInput = z.object({ profileId: z.string().uuid(), mode: socialMode, search: z.string().trim().max(80).default(""), offset: z.number().int().min(0).max(100000).default(0) });
export const socialPage = z.object({ total: z.number(), items: z.array(z.object({ id: z.string(), name: z.string(), username: z.string().nullable(), avatar_url: z.string().nullable(), following: z.boolean() })) });
export function mutualLabel(names: string[], total: number) {
  const shown = names.slice(0, 2);
  if (!shown.length || !total) return null;
  const extra = Math.max(0, total - shown.length);
  return `Seguido por ${shown.join(" e ")}${extra ? ` e mais ${extra} ${extra === 1 ? "pessoa que você segue" : "pessoas que você segue"}` : ""}`;
}