import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { profileCoverSchema, validateProfileCoverPaths } from "@/lib/profile-cover";

export const saveProfileCoverPhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => profileCoverSchema.parse(input))
  .handler(async ({ data, context }) => {
    const paths = validateProfileCoverPaths(data, context.userId);
    for (const path of paths) {
      const name = path.slice(context.userId.length + 1);
      const { data: files, error } = await context.supabase.storage.from("avatars").list(context.userId, { search: name });
      if (error || !files?.some((file) => file.name === name)) throw new Error("Foto não encontrada. Envie novamente.");
    }
    const { data: saved, error } = await context.supabase.from("profiles")
      .update({ cover_photo_paths: paths }).eq("id", context.userId).select("id").single();
    if (error || !saved) throw new Error("Não foi possível salvar as fotos. Tente novamente.");
    return { paths };
  });