import { Link } from "@tanstack/react-router";
import { MapPin, Calendar, Clock, Users, Heart, Share2 } from "lucide-react";
import { FIELD_TYPE_LABEL, LEVEL_LABEL, formatPrice } from "@/lib/pelada-utils";
import { useState, type MouseEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

function formatDayMonth(iso: string) {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}
function formatHM(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function PeladaCard({ pelada, featured: _featured }: { pelada: PeladaCardData; featured?: boolean }) {
  const remaining = Math.max(0, pelada.total_slots - pelada.filled_slots);
  const isFull = remaining <= 0;
  const [liked, setLiked] = useState(false);

  const stop = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const toggleLike = async (e: MouseEvent) => {
    stop(e);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    if (liked) {
      await supabase.from("pelada_likes").delete().eq("pelada_id", pelada.id).eq("user_id", u.user.id);
      setLiked(false);
    } else {
      await supabase.from("pelada_likes").insert({ pelada_id: pelada.id, user_id: u.user.id });
      setLiked(true);
    }
  };

  const share = async (e: MouseEvent) => {
    stop(e);
    const url = `${window.location.origin}/pelada/${pelada.id}`;
    const text = `${pelada.name} — ${formatDayMonth(pelada.starts_at)} ${formatHM(pelada.starts_at)} em ${pelada.location_name}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Futquick", text, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast.success("Link copiado!");
    }
  };

  return (
    <Link
      to="/pelada/$peladaId"
      params={{ peladaId: pelada.id }}
      className="block animate-slide-up rounded-3xl overflow-hidden bg-navy-soft border border-white/5 shadow-2xl shadow-black/40 active:scale-[0.98] transition-transform"
    >
      {/* Image + overlay */}
      <div className="relative aspect-[16/10] overflow-hidden">
        {pelada.photo_url ? (
          <img src={pelada.photo_url} alt={pelada.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-cyan/40 via-navy-soft to-navy grid place-items-center">
            <span className="font-display font-extrabold italic text-white/10 text-6xl tracking-tighter">
              {FIELD_TYPE_LABEL[pelada.field_type]?.toUpperCase()}
            </span>
          </div>
        )}
        {/* dark gradient overlays for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/20" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent" />

        {/* Top tags */}
        <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-2">
          <span className="px-3 py-1 rounded-full bg-gray-700/90 backdrop-blur-sm text-white text-[11px] font-bold uppercase tracking-wide drop-shadow-md">
            {FIELD_TYPE_LABEL[pelada.field_type]}
          </span>
          <span className="px-3 py-1 rounded-full bg-gray-700/90 backdrop-blur-sm text-white text-[11px] font-bold uppercase tracking-wide drop-shadow-md">
            {LEVEL_LABEL[pelada.level]}
          </span>
          <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide drop-shadow-md ${
            pelada.price_cents === 0 ? "bg-emerald-500 text-white" : "bg-cyan text-navy"
          }`}>
            {formatPrice(pelada.price_cents)}
          </span>
          {pelada.distance_km != null && (
            <span className="ml-auto px-3 py-1 rounded-full bg-gray-700/90 backdrop-blur-sm text-white text-[11px] font-bold flex items-center gap-1 drop-shadow-md">
              <MapPin className="size-3" /> {pelada.distance_km.toFixed(1)} km
            </span>
          )}
        </div>

        {/* Title + location bottom-left */}
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="font-display text-2xl font-extrabold italic uppercase leading-tight text-white line-clamp-2 [text-shadow:_0_2px_10px_rgba(0,0,0,1)]">
            {pelada.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-1 text-white text-xs font-semibold [text-shadow:_0_1px_6px_rgba(0,0,0,1)]">
            <MapPin className="size-3.5 flex-none" />
            <span className="truncate">{pelada.location_name}</span>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-navy-soft">
        <div className="flex items-center gap-1.5 text-white text-sm font-bold">
          <Calendar className="size-4 text-white" />
          {formatDayMonth(pelada.starts_at)}
        </div>
        <div className="flex items-center gap-1.5 text-white text-sm font-bold">
          <Clock className="size-4 text-white" />
          {formatHM(pelada.starts_at)}
        </div>
        <div className="flex items-center gap-1.5 text-sm font-bold">
          <Users className="size-4 text-white" />
          <span className={isFull ? "text-white/50" : "text-cyan"}>
            {isFull ? "LOTADA" : `${remaining} ${remaining === 1 ? "vaga" : "vagas"}`}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={toggleLike}
            aria-label="Curtir"
            className="size-9 grid place-items-center rounded-full hover:bg-white/5"
          >
            <Heart className={`size-5 ${liked ? "fill-cyan text-cyan" : "text-white/60"}`} />
          </button>
          <button
            onClick={share}
            aria-label="Compartilhar"
            className="size-9 grid place-items-center rounded-full hover:bg-white/5"
          >
            <Share2 className="size-5 text-white/60" />
          </button>
        </div>
      </div>
    </Link>
  );
}
