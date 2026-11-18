import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { brTimeString, brWeekday, nextOccurrenceISO } from "@/lib/pelada-utils";

export const pinPelada = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { peladaId: string }) => {
    if (!input?.peladaId) throw new Error("peladaId obrigatório");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: pelada, error } = await supabase
      .from("peladas")
      .select("*")
      .eq("id", data.peladaId)
      .single();
    if (error) throw new Error(error.message);
    if (pelada.organizer_id !== userId) throw new Error("Apenas o organizador pode fixar a pelada");

    const starts = new Date(pelada.starts_at);
    const weekday = brWeekday(starts);
    const timeOfDay = brTimeString(starts);

    const { data: tpl, error: tplError } = await supabase
      .from("pelada_templates")
      .insert({
        organizer_id: userId,
        name: pelada.name,
        description: pelada.description,
        location_name: pelada.location_name,
        address: pelada.address,
        city: pelada.city,
        latitude: pelada.latitude,
        longitude: pelada.longitude,
        weekday,
        time_of_day: timeOfDay,
        duration_minutes: pelada.duration_minutes,
        total_slots: pelada.total_slots,
        price_cents: pelada.price_cents,
        field_type: pelada.field_type,
        level: pelada.level,
        photo_url: pelada.photo_url,
        auto_approve: pelada.auto_approve,
        active: true,
        last_generated_for: starts.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }),
      })
      .select("*")
      .single();
    if (tplError) throw new Error(tplError.message);

    await supabase.from("peladas").update({ template_id: tpl.id }).eq("id", pelada.id);
    return { templateId: tpl.id as string, weekday, timeOfDay };
  });

export const setTemplateActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { templateId: string; active: boolean }) => {
    if (!input?.templateId) throw new Error("templateId obrigatório");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("pelada_templates")
      .update({ active: data.active })
      .eq("id", data.templateId)
      .eq("organizer_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createNextFromTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { templateId: string }) => {
    if (!input?.templateId) throw new Error("templateId obrigatório");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: tpl, error } = await supabase
      .from("pelada_templates")
      .select("*")
      .eq("id", data.templateId)
      .eq("organizer_id", userId)
      .single();
    if (error) throw new Error(error.message);

    const next = nextOccurrenceISO(tpl.weekday, tpl.time_of_day);
    if (!next) throw new Error("Não foi possível calcular a próxima data");

    const { data: existing } = await supabase
      .from("peladas")
      .select("id")
      .eq("template_id", tpl.id)
      .eq("starts_at", next.iso)
      .maybeSingle();
    if (existing) {
      const { error: renewError } = await supabase.from('pelada_templates').update({ active: true }).eq('id', tpl.id);
      if (renewError) throw new Error(renewError.message);
      return { peladaId: existing.id as string, created: false };
    }

    const { data: created, error: insertError } = await supabase
      .from("peladas")
      .insert({
        organizer_id: userId,
        template_id: tpl.id,
        name: tpl.name,
        description: tpl.description,
        location_name: tpl.location_name,
        address: tpl.address,
        city: tpl.city,
        latitude: tpl.latitude,
        longitude: tpl.longitude,
        starts_at: next.iso,
        duration_minutes: tpl.duration_minutes,
        total_slots: tpl.total_slots,
        filled_slots: 1,
        price_cents: tpl.price_cents,
        field_type: tpl.field_type,
        level: tpl.level,
        photo_url: tpl.photo_url,
        auto_approve: tpl.auto_approve,
        status: "open",
      })
      .select("id")
      .single();
    if (insertError) throw new Error(insertError.message);

    await supabase
      .from("pelada_templates")
      .update({ last_generated_for: next.date, active: true })
      .eq("id", tpl.id);

    return { peladaId: created.id as string, created: true };
  });
