export const FOOTBALL_MODALITIES = [
  { id: "futsal", label: "Futsal" },
  { id: "society", label: "Society" },
  { id: "campo", label: "Campo" },
] as const;

export const OTHER_MODALITIES = [
  { id: "basquete", label: "Basquete" },
  { id: "volei", label: "Vôlei" },
  { id: "futvolei", label: "Futvôlei" },
  { id: "beach_tenis", label: "Beach Tênis" },
  { id: "tenis", label: "Tênis" },
  { id: "corrida", label: "Corrida" },
  { id: "pedal", label: "Pedal" },
] as const;

export const GAME_MODALITIES = [...FOOTBALL_MODALITIES, ...OTHER_MODALITIES];

export function isGameModality(value: string): boolean {
  return GAME_MODALITIES.some((modality) => modality.id === value);
}

export type GameImageInput = { peladaName: string; fieldType: string; city?: string | null };

const SCENES: Record<string, string> = {
  futsal: "an indoor futsal court with polished wood floor, futsal goals and bright ceiling lights",
  campo: "a full-size grass soccer pitch with soccer goals at golden hour",
  society: "a well-kept synthetic-turf society soccer field with soccer goals under evening stadium lights",
  basquete: "a basketball court with basketball hoops, clear court markings and a basketball",
  volei: "a volleyball court with a regulation volleyball net, court markings and a volleyball",
  futvolei: "a beach footvolley sand court with a high net and a footvolley ball, no rackets",
  beach_tenis: "a beach tennis sand court with a beach tennis net, solid beach tennis paddles and a tennis ball",
  tenis: "a tennis court with a low tennis net, stringed tennis rackets and tennis balls",
  corrida: "a running track with marked lanes and runners jogging in sportswear, no balls or nets",
  pedal: "a cycling route with cyclists riding bicycles wearing helmets, no balls or nets",
};

export function buildGameImagePrompt({ peladaName, fieldType, city }: GameImageInput): string {
  const scene = SCENES[fieldType];
  if (!scene) throw new Error("Modalidade inválida");
  return `Cinematic wide-angle editorial sports photo of ${scene}. Clearly show the selected sport and its real equipment. Vivid colors, natural lighting, sharp detail, no text, no logos.${city ? ` Setting: ${city}, Brazil.` : ""} Cover photo for a recreational sports event called ${JSON.stringify(peladaName)}. Do not render the event name as text.`;
}