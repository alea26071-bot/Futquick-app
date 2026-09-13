import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Verdict = { allowed: boolean; reason?: string };

const PROMPT = `Você é um moderador de conteúdo de um aplicativo de futebol amador.
Analise a imagem e responda APENAS com JSON no formato {"allowed": boolean, "reason": string}.
Marque allowed=false se a imagem contiver: nudez, conteúdo sexual ou pornográfico, órgãos genitais,
violência explícita, sangue, armas, drogas, símbolos de ódio, ou qualquer coisa ofensiva.
Fotos comuns de pessoas, rostos, times, campos, quadras e bolas são permitidas (allowed=true).
O campo reason deve ser curto e em português.`;

/** Modera uma imagem já enviada ao storage. Retorna se ela pode ser usada. */
export const moderateImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bucket: "avatars" | "peladas" | "chat"; path: string }) => {
    if (!input?.path || input.path.length > 300) throw new Error("Caminho de imagem inválido");
    if (!["avatars", "peladas", "chat"].includes(input.bucket)) throw new Error("Bucket inválido");
    return input;
  })
  .handler(async ({ data, context }): Promise<Verdict> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { allowed: true };

    const { data: blob, error } = await context.supabase.storage.from(data.bucket).download(data.path);
    if (error || !blob) return { allowed: true };

    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (bytes.byteLength > 6_000_000) return { allowed: true };
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    const dataUrl = `data:${blob.type || "image/jpeg"};base64,${btoa(binary)}`;

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: PROMPT },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
        }),
      });
      if (!response.ok) {
        console.error("[moderateImage] gateway", response.status, await response.text());
        return { allowed: true };
      }
      const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
      const text = json.choices?.[0]?.message?.content ?? "";
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return { allowed: true };
      const parsed = JSON.parse(match[0]) as Verdict;
      if (parsed.allowed === false) {
        // remove a imagem reprovada do storage
        await context.supabase.storage.from(data.bucket).remove([data.path]);
        return { allowed: false, reason: parsed.reason || "A imagem não segue as diretrizes do app." };
      }
      return { allowed: true };
    } catch (err) {
      console.error("[moderateImage]", err);
      return { allowed: true };
    }
  });
