export function photoQualityFor(bucket: "avatars" | "peladas" | "chat", keyHint?: string) {
  if (bucket === "avatars") {
    return keyHint?.startsWith("cover-")
      ? { maxDimension: 2048, quality: 0.92 }
      : { maxDimension: 1024, quality: 0.9 };
  }
  return { maxDimension: 1200, quality: 0.85 };
}