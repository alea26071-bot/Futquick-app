import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LocationPicker, type LocationResult } from "@/components/LocationPicker";
import { uploadUserPhoto } from "@/lib/storage-helpers";
import { generatePeladaImage } from "@/lib/pelada-image.functions";
import { pinPelada } from "@/lib/pelada-templates.functions";
import { WEEKDAY_LABEL, brWeekday } from "@/lib/pelada-utils";
import { X, MapPin, Minus, Plus, Camera, Sparkles, Trash2, Pin } from "lucide-react";


type CriarSearch = { lat?: number; lng?: number; address?: string };

export const Route = createFileRoute("/_authenticated/criar")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): CriarSearch => ({
    lat: typeof s.lat === "number" ? s.lat : s.lat ? Number(s.lat) : undefined,
    lng: typeof s.lng === "number" ? s.lng : s.lng ? Number(s.lng) : undefined,
    address: typeof s.address === "string" ? s.address : undefined,
  }),
  component: CriarPage,
});


const FIELD_TYPES = [
  { id: "society", label: "Society" },
  { id: "futsal", label: "Futsal" },
  { id: "campo", label: "Campo" },
] as const;

const LEVELS = [
  { id: "iniciante", label: "Iniciante" },
  { id: "intermediario", label: "Intermediário" },
  { id: "avancado", label: "Avançado" },
] as const;

function CriarPage() {
  const { user } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<LocationResult | null>(null);
  const today = new Date();
  today.setHours(20, 0, 0, 0);
  const [date, setDate] = useState(today.toISOString().slice(0, 10));
  const [time, setTime] = useState("20:00");
  const [fieldType, setFieldType] = useState<string>("society");
  const [level, setLevel] = useState<string>("intermediario");
  const [totalSlots, setTotalSlots] = useState(12);
  const [price, setPrice] = useState("");
  const [autoApprove, setAutoApprove] = useState(true);
  const [recurring, setRecurring] = useState(false);
  const weekdayLabel = date ? WEEKDAY_LABEL[brWeekday(new Date(`${date}T${time || "20:00"}:00-03:00`))] : null;

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Prefill from mapa long-press
  useEffect(() => {
    if (search.lat && search.lng && !location) {
      setLocation({
        name: search.address?.split(",")[0] ?? "Local selecionado",
        address: search.address ?? `${search.lat.toFixed(5)}, ${search.lng.toFixed(5)}`,
        city: null,
        lat: search.lat,
        lng: search.lng,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.lat, search.lng]);

  const canNext1 = name.trim().length >= 3 && location !== null;
  const canSubmit = canNext1 && fieldType && level && totalSlots >= 2;

  const pickCover = async (file: File) => {
    setUploadingCover(true);
    try {
      const url = await uploadUserPhoto("peladas", user.id, file, "cover");
      setCoverUrl(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar imagem");
    } finally {
      setUploadingCover(false);
    }
  };

  const submit = async () => {
    if (!location) return;
    setSaving(true);
    try {
      let finalPhoto = coverUrl;
      if (!finalPhoto) {
        try {
          const res = await generatePeladaImage({
            data: {
              peladaName: name.trim(),
              fieldType,
              city: location.city ?? null,
            },
          });
          finalPhoto = res.url;
        } catch (e) {
          console.warn("AI image failed", e);
        }
      }
      const startsAt = new Date(`${date}T${time}:00`);
      const priceCents = price ? Math.round(parseFloat(price.replace(",", ".")) * 100) : 0;
      const { data, error } = await supabase
        .from("peladas")
        .insert({
          organizer_id: user.id,
          name: name.trim(),
          description: description.trim() || null,
          location_name: location.name,
          address: location.address,
          city: location.city,
          latitude: location.lat,
          longitude: location.lng,
          starts_at: startsAt.toISOString(),
          total_slots: totalSlots,
          filled_slots: 1,
          price_cents: priceCents,
          field_type: fieldType,
          level,
          photo_url: finalPhoto,
          auto_approve: autoApprove,
          status: "open",
        })
        .select("id")
        .single();
      if (error) throw error;
      if (recurring) {
        try {
          await pinPelada({ data: { peladaId: data.id } });
        } catch (e) {
          console.warn("pin failed", e);
          toast.error("Pelada criada, mas não foi possível fixá-la.");
        }
      }
      toast.success("Pelada criada! Bora completar o time.");
      navigate({ to: "/pelada/$peladaId", params: { peladaId: data.id } });

    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar pelada");
    } finally {
      setSaving(false);
    }
  };

  if (showLocationPicker) {
    return (
      <LocationPicker
        onClose={() => setShowLocationPicker(false)}
        onConfirm={(loc) => {
          setLocation(loc);
          setShowLocationPicker(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <header className="pt-12 px-6 pb-6 flex items-center justify-between">
        <Link to="/descobrir" className="text-white font-bold text-xl">
          <X className="size-6" />
        </Link>
        <div className="flex gap-1.5">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 w-8 rounded-full transition-colors ${step >= s ? "bg-cyan" : "bg-white/10"}`}
            />
          ))}
        </div>
        <div className="w-6" />
      </header>

      <main className="flex-1 px-6 pb-6 overflow-y-auto">
        <h2 className="font-display font-extrabold italic uppercase text-white text-3xl leading-tight mb-8">
          {step === 1 ? (
            <>Criar nova<br />pelada</>
          ) : (
            <>Configure<br />a partida</>
          )}
        </h2>

        {step === 1 && (
          <div className="space-y-6 animate-slide-up">
            <div className="space-y-2">
              <label className="text-mono-label">Nome da pelada</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Clássico das Quintas"
                className="w-full text-xl font-bold bg-transparent border-b-2 border-white/10 py-2 focus:border-cyan outline-none text-white placeholder:text-white/20"
              />
            </div>

            <div className="flex gap-6">
              <div className="flex-1 space-y-2">
                <label className="text-mono-label">Data</label>
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full py-2 bg-transparent border-b-2 border-white/10 font-bold text-white focus:border-cyan outline-none"
                />
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-mono-label">Horário</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full py-2 bg-transparent border-b-2 border-white/10 font-bold text-white focus:border-cyan outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-mono-label">Local da pelada</label>
              {location ? (
                <button
                  onClick={() => setShowLocationPicker(true)}
                  className="w-full p-4 bg-navy-soft rounded-2xl border border-cyan/30 text-left flex items-start gap-3"
                >
                  <div className="size-10 rounded-xl bg-cyan/10 grid place-items-center flex-none">
                    <MapPin className="size-5 text-cyan" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white truncate">{location.name}</p>
                    <p className="text-xs text-white/60 truncate">{location.address}</p>
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => setShowLocationPicker(true)}
                  className="w-full py-4 bg-navy-soft text-white rounded-2xl font-bold border border-white/10 flex items-center justify-center gap-2 active:scale-98"
                >
                  <MapPin className="size-5 text-cyan" />
                  Selecionar local no mapa
                </button>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-mono-label">Descrição (opcional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Traga bola, chuteira de trava..."
                rows={3}
                className="w-full p-3 bg-navy-soft rounded-2xl border border-white/10 text-white placeholder:text-white/30 focus:border-cyan outline-none resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-mono-label">Foto da pelada (opcional)</label>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) pickCover(f);
                  e.currentTarget.value = "";
                }}
              />
              {coverUrl ? (
                <div className="relative rounded-2xl overflow-hidden border border-cyan/30">
                  <img src={coverUrl} alt="Capa" className="w-full h-40 object-cover" />
                  <button
                    onClick={() => setCoverUrl(null)}
                    className="absolute top-2 right-2 size-9 rounded-full bg-navy/80 grid place-items-center"
                    aria-label="Remover foto"
                  >
                    <Trash2 className="size-4 text-white" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadingCover}
                  className="w-full py-4 bg-navy-soft text-white rounded-2xl font-bold border border-dashed border-white/20 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                >
                  {uploadingCover ? (
                    <span className="size-4 rounded-full border-2 border-cyan border-t-transparent animate-spin" />
                  ) : (
                    <Camera className="size-5 text-cyan" />
                  )}
                  {uploadingCover ? "Enviando..." : "Enviar foto"}
                </button>
              )}
              <p className="text-[11px] text-white/40 flex items-center gap-1.5">
                <Sparkles className="size-3 text-cyan" />
                Se não enviar, geramos uma imagem por IA para você.
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-slide-up">
            <div className="space-y-3">
              <label className="text-mono-label">Tipo de campo</label>
              <div className="grid grid-cols-3 gap-2">
                {FIELD_TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setFieldType(t.id)}
                    className={`py-3 rounded-xl border font-bold text-xs uppercase transition-colors ${
                      fieldType === t.id
                        ? "border-cyan bg-cyan/10 text-cyan"
                        : "border-white/10 text-white/60"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-mono-label">Nível</label>
              <div className="grid grid-cols-3 gap-2">
                {LEVELS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLevel(l.id)}
                    className={`py-3 rounded-xl border font-bold text-xs uppercase transition-colors ${
                      level === l.id
                        ? "border-cyan bg-cyan/10 text-cyan"
                        : "border-white/10 text-white/60"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-mono-label">Quantos jogadores faltam pra pelada?</label>
              <div className="flex items-center justify-between p-4 bg-navy-soft rounded-2xl border border-white/10">
                <button
                  onClick={() => setTotalSlots((s) => Math.max(2, s - 1))}
                  className="size-12 rounded-full bg-navy border border-white/10 text-cyan grid place-items-center"
                >
                  <Minus className="size-5" />
                </button>
                <div className="text-center">
                  <span className="block text-4xl font-display font-extrabold text-white leading-none">{Math.max(1, totalSlots - 1)}</span>
                  <span className="block text-[10px] uppercase tracking-widest text-white/50 mt-1">
                    {totalSlots - 1 === 1 ? "jogador falta" : "jogadores faltam"}
                  </span>
                </div>
                <button
                  onClick={() => setTotalSlots((s) => Math.min(40, s + 1))}
                  className="size-12 rounded-full bg-cyan text-navy grid place-items-center"
                >
                  <Plus className="size-5" strokeWidth={3} />
                </button>
              </div>
              <p className="text-xs text-white/50">Você já conta como 1 jogador. Total do time: {totalSlots}.</p>
            </div>

            <div className="space-y-3">
              <label className="text-mono-label">Valor por jogador (opcional)</label>
              <div className="flex items-center gap-2 p-4 bg-navy-soft rounded-2xl border border-white/10">
                <span className="text-white/40 font-mono font-bold">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/[^0-9.,]/g, ""))}
                  placeholder="0 (grátis)"
                  className="flex-1 bg-transparent text-white text-xl font-bold focus:outline-none placeholder:text-white/20"
                />
              </div>
            </div>

            <label className="flex items-center gap-3 p-4 bg-navy-soft rounded-2xl border border-white/10 cursor-pointer">
              <input
                type="checkbox"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
                className="size-5 accent-cyan"
              />
              <div className="flex-1">
                <p className="text-white font-bold text-sm">Aprovação automática</p>
                <p className="text-xs text-white/50">Jogadores entram sem esperar sua confirmação.</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 bg-navy-soft rounded-2xl border border-cyan/20 cursor-pointer">
              <input
                type="checkbox"
                checked={recurring}
                onChange={(e) => setRecurring(e.target.checked)}
                className="size-5 accent-cyan"
              />
              <div className="flex-1">
                <p className="text-white font-bold text-sm flex items-center gap-1.5">
                  <Pin className="size-3.5 text-cyan" /> Repetir toda semana
                </p>
                <p className="text-xs text-white/50">
                  Fixa a pelada {weekdayLabel ? `toda ${weekdayLabel} · ${time}` : "neste dia e horário"} e cria a próxima
                  automaticamente.
                </p>
              </div>
            </label>

          </div>
        )}
      </main>

      <footer className="p-6 bg-navy-soft border-t border-white/10 flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-mono-label text-white/40">Passo {step} de 2</p>
          <p className="text-sm font-bold text-white">
            {step === 1 ? "Informações básicas" : "Detalhes da partida"}
          </p>
        </div>
        {step === 1 ? (
          <button
            disabled={!canNext1}
            onClick={() => setStep(2)}
            className="px-8 py-4 bg-cyan text-navy rounded-2xl font-display font-extrabold italic uppercase disabled:opacity-30 active:scale-95 transition-transform"
          >
            Próximo
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-4 bg-navy border border-white/10 text-white rounded-2xl font-bold uppercase text-xs"
            >
              Voltar
            </button>
            <button
              disabled={!canSubmit || saving}
              onClick={submit}
              className="px-6 py-4 bg-cyan text-navy rounded-2xl font-display font-extrabold italic uppercase disabled:opacity-30 active:scale-95 transition-transform"
            >
              {saving ? "..." : "Criar"}
            </button>
          </div>
        )}
      </footer>
    </div>
  );
}
