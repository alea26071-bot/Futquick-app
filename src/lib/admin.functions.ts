import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdminRole } from "@/lib/admin-authorization.server";

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdminRole(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: users }, { data: peladas }, { data: requests }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select(
          "id, name, phone, age, city, state, avatar_url, notify_radius_km, latitude, longitude, peladas_played, rating_avg, postura_score, onboarding_complete, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseAdmin
        .from("peladas")
        .select(
          "id, name, organizer_id, city, location_name, starts_at, total_slots, filled_slots, status, price_cents, latitude, longitude, created_at",
        )
        .order("starts_at", { ascending: false })
        .limit(300),
      supabaseAdmin
        .from("pelada_requests")
        .select("id, pelada_id, user_id, status, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);
    return {
      users: users ?? [],
      peladas: peladas ?? [],
      requests: requests ?? [],
    };
  });

export const adminUpdateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      name?: string;
      city?: string | null;
      state?: string | null;
      age?: number | null;
      notify_radius_km?: number | null;
      postura_score?: number;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await requireAdminRole(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", id);
    if (error) throw new Error("Não foi possível atualizar o usuário");
    return { ok: true };
  });

export const adminUpdatePelada = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      name?: string;
      location_name?: string;
      city?: string | null;
      starts_at?: string;
      total_slots?: number;
      filled_slots?: number;
      price_cents?: number;
      status?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await requireAdminRole(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("peladas").update(patch).eq("id", id);
    if (error) throw new Error("Não foi possível atualizar a pelada");
    return { ok: true };
  });

export const adminDeletePelada = createServerFn({ method: "POST" })

  .middleware([requireSupabaseAuth])
  .inputValidator((input: { peladaId: string }) => input)
  .handler(async ({ data, context }) => {
    await requireAdminRole(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("peladas").delete().eq("id", data.peladaId);
    if (error) throw new Error("Não foi possível excluir a pelada");
    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    await requireAdminRole(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("Você não pode excluir sua própria conta");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error("Não foi possível excluir o usuário");
    return { ok: true };
  });
