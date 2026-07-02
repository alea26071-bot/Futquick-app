import logoAsset from "@/assets/futquick-logo.png.asset.json";

export function Logo({ className = "size-9 rounded-xl" }: { className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="Futquick"
      className={`${className} object-cover`}
      draggable={false}
    />
  );
}
