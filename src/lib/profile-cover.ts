import { z } from "zod";

export const profileCoverSchema = z.array(z.string().min(1)).max(3, "Você pode adicionar até 3 fotos.")
  .refine((paths) => new Set(paths).size === paths.length, "As fotos devem ser diferentes.");

export function validateProfileCoverPaths(input: unknown, userId: string) {
  const paths = profileCoverSchema.parse(input);
  if (paths.some((path) => !path.startsWith(`${userId}/cover-`) || path.includes("..") || path.split("/").length !== 2)) {
    throw new Error("Foto de capa inválida.");
  }
  return paths;
}

export function moveCoverPhoto(paths: string[], index: number, direction: -1 | 1) {
  const next = index + direction;
  if (index < 0 || index >= paths.length || next < 0 || next >= paths.length) return paths;
  const result = [...paths];
  [result[index], result[next]] = [result[next], result[index]];
  return result;
}

export function validateCoverSelection<T extends { type: string }>(files: T[], existingCount: number, replacementIndex: number | null): T[] {
  const available = replacementIndex === null ? 3 - existingCount : 1;
  if (files.length > available) {
    throw new Error(replacementIndex === null
      ? `Você pode selecionar até ${available} foto${available === 1 ? "" : "s"} agora (máximo de 3 no perfil).`
      : "Selecione apenas uma foto para substituir.");
  }
  if (files.some((file) => !file.type.startsWith("image/"))) {
    throw new Error("Escolha apenas imagens da sua galeria.");
  }
  return files;
}