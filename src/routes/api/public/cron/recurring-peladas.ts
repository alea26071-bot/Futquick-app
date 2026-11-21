import { createFileRoute } from "@tanstack/react-router";
import { nextOccurrenceISO } from "@/lib/pelada-utils";

async function run() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: templates, error } = await supabaseAdmin
    .from("pelada_templates")
    .select("*")
    .eq("active", true);
  if (error) return { created: 0, error: error.message };

  let created = 0;
  for (const tpl of templates ?? []) {
    const next = nextOccurrenceISO(tpl.weekday, tpl.time_of_day);
    if (!next) continue;
    // only create within the 7-day horizon
    if (new Date(next.iso).getTime() - Date.now() > 8 * 86400000) continue;

    const { data: existing } = await supabaseAdmin
      .from("peladas")
      .select("id")
      .eq("template_id", tpl.id)
      .eq("starts_at", next.iso)
      .maybeSingle();
    if (existing) continue;

    const { data: inserted, error: insertError } = await supabaseAdmin.from("peladas").insert({
      organizer_id: tpl.organizer_id,
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
    }).select("id").single();
    if (!insertError && inserted) {
      created++;
      const { notifyNearbyPeladaCreated } = await import("@/lib/nearby-notify.server");
      await notifyNearbyPeladaCreated(inserted.id).catch((e) => console.error("[nearby] recurring", e));
      await supabaseAdmin
        .from("pelada_templates")
        .update({ last_generated_for: next.date })
        .eq("id", tpl.id);
    }
  }
  return { created };
}

export const Route = createFileRoute("/api/public/cron/recurring-peladas")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = request.headers.get("apikey");
        const expected = process.env["SUPABASE_ANON_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!expected || key !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        const result = await run();
        return Response.json(result);
      },
    },
  },
});
