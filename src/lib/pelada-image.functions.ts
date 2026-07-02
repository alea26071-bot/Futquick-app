import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/images/generations";
const MODEL = "openai/gpt-image-1-mini";
const SIGNED_URL_TTL = 60 * 60 * 24 * 365;

type Input = { peladaName: string; fieldType: string; city?: string | null };

function buildPrompt({ peladaName, fieldType, city }: Input) {
  const surface =
    fieldType === "futsal"
      ? "an indoor futsal court with polished wood floor and bright ceiling lights"
      : fieldType === "campo"
        ? "a full-size grass soccer pitch at golden hour"
        : "a well-kept synthetic-turf society soccer field under evening stadium lights";
  return `Cinematic wide-angle photo of ${surface}, empty and ready for a pickup match. Vivid colors, deep blue sky, subtle rim light, no players, no text, no logos. Editorial soccer/football vibe${city ? ` in ${city}, Brazil` : ""}. Poster for a pickup match called "${peladaName}". Ultra sharp, high detail.`;
}

export const generatePeladaImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Input) => {
    if (!input || typeof input.peladaName !== "string" || typeof input.fieldType !== "string") {
      throw new Error("Invalid input");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        prompt: buildPrompt(data),
        size: "1024x1024",
        quality: "low",
        n: 1,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`AI image generation failed [${res.status}]: ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
    const first = json.data?.[0];
    let bytes: Uint8Array;
    if (first?.b64_json) {
      const bin = atob(first.b64_json);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } else if (first?.url) {
      const imgRes = await fetch(first.url);
      const buf = await imgRes.arrayBuffer();
      bytes = new Uint8Array(buf);
    } else {
      throw new Error("AI image response missing data");
    }

    const path = `${context.userId}/ai-${Date.now()}.png`;
    const { error: upErr } = await context.supabase.storage
      .from("peladas")
      .upload(path, bytes, { contentType: "image/png", upsert: true, cacheControl: "3600" });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

    const { data: signed, error: signErr } = await context.supabase.storage
      .from("peladas")
      .createSignedUrl(path, SIGNED_URL_TTL);
    if (signErr) throw new Error(`Signing failed: ${signErr.message}`);

    return { url: signed.signedUrl };
  });
