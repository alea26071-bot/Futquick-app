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
      className="block animate-slide-up rounded-3xl overflow-hidden border border-white/5 shadow-2xl shadow-black/40 active:scale-[0.98] transition-transform"
      style={{ backgroundColor: "#1e293b" }}
    >
      {/* Image + overlay */}
      <div className="relative aspect-[16/10] overflow-hidden">
        {pelada.photo_url ? (
          <img src={pelada.photo_url} alt={pelada.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-cyan/40 via-navy-soft to-navy grid place-items-center">
            <span className="font-display font-extrabold italic text-6xl tracking-tighter" style={{ color: "rgba(255,255,255,0.1)" }}>
              {FIELD_TYPE_LABEL[pelada.field_type]?.toUpperCase()}
            </span>
          </div>
        )}
        {/* dark gradient overlays for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/20" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent" />

        {/* Top tags */}
        <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-2">
          <span className="px-3 py-1 rounded-full backdrop-blur-sm text-[11px] font-bold uppercase tracking-wide drop-shadow-md" style={{ backgroundColor: "rgba(55,65,81,0.9)", color: "#fff" }}>
            {FIELD_TYPE_LABEL[pelada.field_type]}
          </span>
          <span className="px-3 py-1 rounded-full backdrop-blur-sm text-[11px] font-bold uppercase tracking-wide drop-shadow-md" style={{ backgroundColor: "rgba(55,65,81,0.9)", color: "#fff" }}>
            {LEVEL_LABEL[pelada.level]}
          </span>
          <span
            className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide drop-shadow-md"
            style={
              pelada.price_cents === 0
                ? { backgroundColor: "#10b981", color: "#fff" }
                : { backgroundColor: "#22d3ee", color: "#0b1220" }
            }
          >
            {formatPrice(pelada.price_cents)}
          </span>
          {pelada.distance_km != null && (
            <span className="ml-auto px-3 py-1 rounded-full backdrop-blur-sm text-xs font-stat font-bold flex items-center gap-1 drop-shadow-md" style={{ backgroundColor: "rgba(55,65,81,0.9)", color: "#fff" }}>
              <MapPin className="size-3" /> {pelada.distance_km.toFixed(1)} km
            </span>
          )}
        </div>

        {/* Title + location bottom-left */}
        <div className="absolute bottom-3 left-4 right-4">
          <h3
            className="font-display text-2xl font-extrabold italic uppercase leading-tight line-clamp-2"
            style={{ color: "#ffffff", textShadow: "0 2px 10px rgba(0,0,0,1), 0 0 2px rgba(0,0,0,0.9)" }}
          >
            {pelada.name}
          </h3>
          <div
            className="flex items-center gap-1.5 mt-1 text-xs font-semibold"
            style={{ color: "#ffffff", textShadow: "0 1px 6px rgba(0,0,0,1)" }}
          >
            <MapPin className="size-3.5 flex-none" />
            <span className="truncate">{pelada.location_name}</span>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: "#1e293b" }}>
        <div className="flex items-center gap-1.5 text-sm font-bold" style={{ color: "#ffffff" }}>
          <Calendar className="size-4" style={{ color: "#ffffff" }} />
          {formatDayMonth(pelada.starts_at)}
        </div>
        <div className="flex items-center gap-1.5 text-sm font-bold" style={{ color: "#ffffff" }}>
          <Clock className="size-4" style={{ color: "#ffffff" }} />
          {formatHM(pelada.starts_at)}
        </div>
        <div className="flex items-center gap-1.5 text-sm font-bold">
          <Users className="size-4" style={{ color: "#ffffff" }} />
          <span style={{ color: isFull ? "rgba(255,255,255,0.5)" : "#22d3ee" }}>
            {isFull ? "LOTADA" : `${remaining} ${remaining === 1 ? "vaga" : "vagas"}`}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={toggleLike}
            aria-label="Curtir"
            className="size-9 grid place-items-center rounded-full hover:bg-white/5"
          >
            <Heart className="size-5" style={{ color: liked ? "#22d3ee" : "rgba(255,255,255,0.7)", fill: liked ? "#22d3ee" : "transparent" }} />
          </button>
          <button
            onClick={share}
            aria-label="Compartilhar"
            className="size-9 grid place-items-center rounded-full hover:bg-white/5"
          >
            <Share2 className="size-5" style={{ color: "rgba(255,255,255,0.7)" }} />
          </button>
        </div>
      </div>
    </Link>
  );
}
