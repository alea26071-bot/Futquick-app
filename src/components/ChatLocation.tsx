import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GoogleMap } from "./GoogleMap";
import { MapPin, Navigation, Radio, X, Square } from "lucide-react";
import { toast } from "sonner";

export const SHARE_DURATIONS = [
  { label: "15 min", minutes: 15 },
  { label: "1 hora", minutes: 60 },
  { label: "8 horas", minutes: 480 },
] as const;

export interface LiveLocationRow {
  id: string;
  thread_id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  expires_at: string;
  updated_at: string;
}

/** Hook that manages the current user's live location sharing for a thread. */
export function useLiveLocationShare(threadId: string, userId: string) {
  const [sharingUntil, setSharingUntil] = useState<Date | null>(null);
  const watchRef = useRef<number | null>(null);

  const clearWatch = useCallback(() => {
    if (watchRef.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
  }, []);

  const stop = useCallback(async () => {
    clearWatch();
    setSharingUntil(null);
    await supabase.from("live_locations").delete().eq("thread_id", threadId).eq("user_id", userId);
  }, [clearWatch, threadId, userId]);

  const start = useCallback(
    async (minutes: number) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        toast.error("Localização não disponível neste dispositivo");
        return;
      }
      const pos = await new Promise<GeolocationPosition | null>((resolve) =>
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 10000 },
        ),
      );
      if (!pos) {
        toast.error("Permita o acesso à localização para compartilhar");
        return;
      }
      const expires = new Date(Date.now() + minutes * 60_000);
      const { error } = await supabase.from("live_locations").upsert(
        {
          thread_id: threadId,
          user_id: userId,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
          expires_at: expires.toISOString(),
        },
        { onConflict: "thread_id,user_id" },
      );
      if (error) {
        toast.error(error.message);
        return;
      }
      setSharingUntil(expires);
      await supabase.from("chat_messages").insert({
        thread_id: threadId,
        sender_id: userId,
        kind: "live_location",
        body: `Compartilhando localização em tempo real por ${minutes >= 60 ? `${minutes / 60}h` : `${minutes} min`}`,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      watchRef.current = navigator.geolocation.watchPosition(
        (p) => {
          void supabase
            .from("live_locations")
            .update({
              latitude: p.coords.latitude,
              longitude: p.coords.longitude,
              accuracy: p.coords.accuracy ?? null,
            })
            .eq("thread_id", threadId)
            .eq("user_id", userId);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000 },
      );
      toast.success("Localização em tempo real ativada");
    },
    [threadId, userId],
  );

  // Auto-stop when the chosen duration ends
  useEffect(() => {
    if (!sharingUntil) return;
    const ms = sharingUntil.getTime() - Date.now();
    if (ms <= 0) {
      void stop();
      return;
    }
    const t = setTimeout(() => void stop(), ms);
    return () => clearTimeout(t);
  }, [sharingUntil, stop]);

  useEffect(() => clearWatch, [clearWatch]);

  return { sharingUntil, start, stop };
}

/** Bottom sheet to pick between one-off and live location sharing. */
export function LocationShareSheet({
  onClose,
  onSendCurrent,
  onStartLive,
}: {
  onClose: () => void;
  onSendCurrent: () => void;
  onStartLive: (minutes: number) => void;
}) {
  const [live, setLive] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div
        className="bg-navy-soft rounded-t-3xl border-t border-white/10 p-5 pb-8 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-extrabold italic uppercase text-white">Localização</h3>
          <button onClick={onClose} className="size-9 rounded-full bg-navy grid place-items-center" aria-label="Fechar">
            <X className="size-4 text-white" />
          </button>
        </div>

        {!live ? (
          <div className="space-y-3">
            <button
              onClick={onSendCurrent}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-navy border border-white/10 text-left active:scale-[0.98] transition-transform"
            >
              <div className="size-10 rounded-xl bg-cyan/10 grid place-items-center flex-none">
                <MapPin className="size-5 text-cyan" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Enviar localização atual</p>
                <p className="text-xs text-white/50">Um ponto fixo, enviado uma vez</p>
              </div>
            </button>
            <button
              onClick={() => setLive(true)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-navy border border-white/10 text-left active:scale-[0.98] transition-transform"
            >
              <div className="size-10 rounded-xl bg-cyan/10 grid place-items-center flex-none">
                <Radio className="size-5 text-cyan" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Compartilhar em tempo real</p>
                <p className="text-xs text-white/50">Escolha por quanto tempo</p>
              </div>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-white/60">Por quanto tempo deseja compartilhar?</p>
            {SHARE_DURATIONS.map((d) => (
              <button
                key={d.minutes}
                onClick={() => onStartLive(d.minutes)}
                className="w-full py-4 rounded-2xl bg-navy border border-white/10 text-white font-bold text-sm active:scale-[0.98] transition-transform"
              >
                {d.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Banner shown while someone in the thread is sharing live location. */
export function LiveLocationBanner({
  row,
  label,
  isMine,
  onStop,
}: {
  row: LiveLocationRow;
  label: string;
  isMine: boolean;
  onStop?: () => void;
}) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const tick = () => {
      const ms = new Date(row.expires_at).getTime() - Date.now();
      if (ms <= 0) return setRemaining("expirado");
      const mins = Math.ceil(ms / 60_000);
      setRemaining(mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}min` : `${mins} min`);
    };
    tick();
    const i = setInterval(tick, 30_000);
    return () => clearInterval(i);
  }, [row.expires_at]);

  return (
    <div className="mx-4 mt-3 rounded-2xl overflow-hidden border border-cyan/30 bg-navy-soft">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <span className="relative flex size-2.5 flex-none">
          <span className="absolute inset-0 rounded-full bg-cyan animate-ping" />
          <span className="relative rounded-full size-2.5 bg-cyan" />
        </span>
        <p className="text-xs text-white flex-1 truncate">
          <span className="font-bold">{label}</span> · tempo real · {remaining}
        </p>
        {isMine && onStop && (
          <button
            onClick={onStop}
            className="flex items-center gap-1 text-[11px] font-bold text-cyan px-2 py-1 rounded-full bg-cyan/10"
          >
            <Square className="size-3" strokeWidth={3} />
            Parar
          </button>
        )}
      </div>
      <GoogleMap
        center={{ lat: row.latitude, lng: row.longitude }}
        zoom={15}
        markers={[{ lat: row.latitude, lng: row.longitude, title: label }]}
        interactive={false}
        className="h-40 w-full"
      />
    </div>
  );
}

/** Static location message bubble. */
export function LocationMessageCard({
  lat,
  lng,
  live,
  mine,
}: {
  lat: number;
  lng: number;
  live?: boolean;
  mine?: boolean;
}) {
  return (
    <a
      href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
      target="_blank"
      rel="noreferrer"
      className="block rounded-xl overflow-hidden border border-white/10"
    >
      <GoogleMap
        center={{ lat, lng }}
        zoom={15}
        markers={[{ lat, lng }]}
        interactive={false}
        className="h-32 w-48"
      />
      <div className={`flex items-center gap-1.5 px-3 py-2 ${mine ? "bg-cyan/20" : "bg-navy"}`}>
        {live ? <Radio className="size-3.5 text-cyan" /> : <Navigation className="size-3.5 text-cyan" />}
        <span className="text-[11px] text-white font-bold">
          {live ? "Localização em tempo real" : "Ver no mapa"}
        </span>
      </div>
    </a>
  );
}
