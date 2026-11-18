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