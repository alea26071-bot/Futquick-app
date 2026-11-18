import { Link } from "@tanstack/react-router";
import { MapPin, Calendar, Clock, Users, Heart, Share2 } from "lucide-react";
import { FIELD_TYPE_LABEL, LEVEL_LABEL, formatPrice } from "@/lib/pelada-utils";
import { useState, type MouseEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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
      className="pelada-feed-card block animate-slide-up rounded-3xl overflow-hidden border border-border shadow-pelada active:scale-[0.98] transition-transform"
    >
      {/* Image + overlay */}
      <div className="pelada-feed-photo relative overflow-hidden">
        {pelada.photo_url ? (
          <img src={pelada.photo_url} alt={pelada.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-secondary grid place-items-center">
            <span className="font-display font-extrabold italic text-4xl text-muted-foreground">
              {FIELD_TYPE_LABEL[pelada.field_type]?.toUpperCase()}
            </span>
          </div>
        )}
        {/* dark gradient overlays for legibility */}
        <div className="pelada-feed-overlay absolute inset-0" />

        {/* Top tags */}
        <div className="relative z-10 flex flex-wrap content-start gap-2">
          <span className="pelada-feed-tag px-3 py-1 rounded-full text-[11px] font-bold uppercase">
            {FIELD_TYPE_LABEL[pelada.field_type]}
          </span>
          <span className="pelada-feed-tag px-3 py-1 rounded-full text-[11px] font-bold uppercase">
            {LEVEL_LABEL[pelada.level]}
          </span>
          <span
            className="px-3 py-1 rounded-full text-[11px] font-bold uppercase bg-primary text-primary-foreground"
          >
            {formatPrice(pelada.price_cents)}
          </span>
          {pelada.distance_km != null && (
            <span className="pelada-feed-tag ml-auto px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1">
              <MapPin className="size-3" /> {pelada.distance_km.toFixed(1)} km
            </span>
          )}
        </div>

        {/* Title + location bottom-left */}
        <div className="relative z-10 self-end">
          <h3
            className="font-display text-2xl font-extrabold italic uppercase leading-tight break-words"
          >
            {pelada.name}
          </h3>
          <div
            className="flex items-center gap-1.5 mt-1 text-xs font-semibold"
          >
            <MapPin className="size-3.5 flex-none" />
            <span className="truncate">{pelada.location_name}</span>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="pelada-feed-footer grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 text-card-foreground">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-1.5 text-sm font-bold">
          <Calendar className="size-4 shrink-0" />
          {formatDayMonth(pelada.starts_at)}
        </div>
        <div className="flex items-center gap-1.5 text-sm font-bold">
          <Clock className="size-4 shrink-0" />
          {formatHM(pelada.starts_at)}
        </div>
        <div className="flex items-center gap-1.5 text-sm font-bold">
          <Users className="size-4 shrink-0" />
          <span className={isFull ? 'text-muted-foreground' : 'text-primary'}>
            {isFull ? "LOTADA" : `${remaining} ${remaining === 1 ? "vaga" : "vagas"}`}
          </span>
        </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon"
            onClick={toggleLike}
            aria-label="Curtir"
            className="size-9 rounded-full"
          >
            <Heart className={liked ? 'size-5 fill-primary text-primary' : 'size-5 text-muted-foreground'} />
          </Button>
          <Button variant="ghost" size="icon"
            onClick={share}
            aria-label="Compartilhar"
            className="size-9 rounded-full"
          >
            <Share2 className="size-5 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </Link>
  );
}
