import { supabase } from "@/integrations/supabase/client";
import { moderateImage } from "@/lib/moderation.functions";
import { photoQualityFor } from "@/lib/photo-quality";

const SIGNED_URL_TTL = 60 * 60 * 24 * 365; // 1 year

async function fileToJpegBlob(file: File, maxDim = 1200, quality = 0.85): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = (error) => { URL.revokeObjectURL(i.src); reject(error); };
    i.src = URL.createObjectURL(file);
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  URL.revokeObjectURL(img.src);
  if (!ctx) throw new Error("Não foi possível preparar a imagem.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas encode failed"))), "image/jpeg", quality);
  });
}

export async function uploadUserPhoto(
  bucket: "avatars" | "peladas" | "chat",
  userId: string,
  file: File,
  keyHint?: string,
): Promise<string> {
  const path = await uploadUserPhotoPath(bucket, userId, file, keyHint);
  const { data, error: signErr } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL);
  if (signErr) throw signErr;
  return data.signedUrl;
}

export async function uploadUserPhotoPath(
  bucket: "avatars" | "peladas" | "chat",
  userId: string,
  file: File,
  keyHint?: string,
): Promise<string> {
  let blob: Blob = file;
  let ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  let contentType = file.type || "image/jpeg";
  try {
    const { maxDimension, quality } = photoQualityFor(bucket, keyHint);
    blob = await fileToJpegBlob(file, maxDimension, quality);
    ext = "jpg";
    contentType = "image/jpeg";
  } catch {
    // Formato não decodificável no navegador (ex.: HEIC): envia o original.
  }
  const path = `${userId}/${keyHint ?? "img"}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    upsert: true,
    contentType,
    cacheControl: "3600",
  });
  if (error) throw new Error("Não foi possível enviar a foto. Tente outra imagem.");

  // Moderação automática: recusa nudez, conteúdo sexual, violência ou ofensas.
  let verdict: { allowed: boolean; reason?: string } = { allowed: true };
  try {
    verdict = await moderateImage({ data: { bucket, path } });
  } catch (e) {
    console.error("[uploadUserPhoto] moderação indisponível", e);
  }
  if (!verdict.allowed) {
    throw new Error(verdict.reason || "Esta imagem não segue as diretrizes do Futquick.");
  }

  return path;
}
