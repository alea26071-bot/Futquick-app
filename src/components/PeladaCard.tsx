import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { FIELD_TYPE_LABEL, LEVEL_LABEL, formatPrice, timeUntil } from "@/lib/pelada-utils";

export interface PeladaCardData {
  id: string;
  name: string;
  location_name: string;
  city: string | null;
  starts_at: string;
  total_slots: number;
  filled_slots: number;
  price_cents: number;
  field_type: string;
  level: string;
  photo_url: string | null;
  distance_km?: number;
}

export function PeladaCard({ pelada, featured }: { pelada: PeladaCardData; featured?: boolean }) {
  const remaining = pelada.total_slots - pelada.filled_slots;
  const isFull = remaining <= 0;

  if (featured) {
    return (
      <Link
        to="/pelada/$peladaId"
        params={{ peladaId: pelada.id }}
        className="block animate-slide-up bg-navy-soft rounded-3xl overflow-hidden shadow-2xl shadow-cyan/10 border border-white/5 active:scale-[0.98] transition-transform"
      >
        <div className="relative aspect-[16/9] bg-gradient-to-br from-cyan/30 via-navy-soft to-navy overflow-hidden">
          {pelada.photo_url ? (
            <img src={pelada.photo_url} alt={pelada.name} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <span className="font-display font-extrabold italic text-white/10 text-6xl tracking-tighter">
                {FIELD_TYPE_LABEL[pelada.field_type]?.toUpperCase()}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-navy-soft via-transparent to-transparent" />
          <div className="absolute top-4 left-4 bg-cyan text-navy px-3 py-1.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider">
            {timeUntil(pelada.starts_at)}
          </div>
          {pelada.distance_km != null && (
            <div className="absolute top-4 right-4 bg-navy/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
              <MapPin className="size-3" />
              {pelada.distance_km.toFixed(1)} km
            </div>
          )}
        </div>
        <div className="p-5">
          <div className="flex justify-between items-start mb-2 gap-3">
            <h3 className="font-display text-xl font-extrabold italic uppercase leading-tight text-white line-clamp-2">
              {pelada.name}
            </h3>
            <span className="font-mono text-cyan text-sm font-bold whitespace-nowrap">{formatPrice(pelada.price_cents)}</span>
          </div>
          <div className="flex items-center gap-2 text-white/60 text-xs mb-4">
            <span>{FIELD_TYPE_LABEL[pelada.field_type]}</span>
            <span className="size-1 bg-white/20 rounded-full" />
            <span>{LEVEL_LABEL[pelada.level]}</span>
            <span className="size-1 bg-white/20 rounded-full" />
            <span className="truncate">{pelada.location_name}</span>
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-white/10">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[...Array(Math.min(3, pelada.filled_slots))].map((_, i) => (
                  <div
                    key={i}
                    className="size-8 rounded-full border-2 border-navy-soft grid place-items-center text-[10px] font-bold text-navy"
                    style={{ background: `oklch(${0.75 - i * 0.1} 0.18 220)` }}
                  />
                ))}
                {pelada.filled_slots > 3 && (
                  <div className="size-8 rounded-full border-2 border-navy-soft bg-cyan grid place-items-center text-[10px] font-bold text-navy">
                    +{pelada.filled_slots - 3}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-mono text-sm font-bold ${isFull ? "text-white/40" : "text-white"}`}>
                {isFull ? "LOTADA" : `${remaining} ${remaining === 1 ? "VAGA" : "VAGAS"}`}
              </span>
              {!isFull && remaining <= 2 && (
                <div className="size-2 bg-cyan rounded-full animate-pulse-ring" />
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // compact
  const d = new Date(pelada.starts_at);
  const day = d.getDate().toString().padStart(2, "0");
  const month = d.toLocaleDateString("pt-BR", { month: "short" }).slice(0, 3).toUpperCase();
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <Link
      to="/pelada/$peladaId"
      params={{ peladaId: pelada.id }}
      className="flex gap-4 p-4 bg-navy-soft/50 rounded-2xl border border-white/5 active:scale-[0.98] transition-transform animate-slide-up"
    >
      <div className="size-16 rounded-xl bg-navy flex-none flex flex-col items-center justify-center border border-white/10">
        <span className="text-mono-label text-cyan">{month}</span>
        <span className="text-xl font-display font-extrabold text-white leading-none">{day}</span>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-display font-extrabold italic uppercase text-white truncate">{pelada.name}</h4>
        <p className="text-xs text-white/50 truncate">
          {pelada.location_name} · {time}
        </p>
        <div className="mt-2 flex gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded bg-navy text-[10px] font-bold text-cyan border border-white/10">
            {isFull ? "LOTADA" : `${remaining} VAGAS`}
          </span>
          <span className="px-2 py-0.5 rounded bg-navy text-[10px] font-bold text-white/50 border border-white/10">
            {LEVEL_LABEL[pelada.level].toUpperCase()}
          </span>
        </div>
      </div>
    </Link>
  );
}
