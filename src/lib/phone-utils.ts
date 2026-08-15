// Brazilian phone helpers. Store digits only; display with mask.

const VALID_DDDS = new Set<number>([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

export function onlyDigits(v: string): string {
  return (v || "").replace(/\D/g, "");
}

export function maskPhoneBR(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// Telefone reservado da conta de administrador (desenvolvedor).
export const ADMIN_PHONE_DIGITS = "12121212121";

export function validatePhoneBR(raw: string): { ok: boolean; digits: string; error?: string } {
  const digits = onlyDigits(raw);
  if (digits === ADMIN_PHONE_DIGITS) return { ok: true, digits };
  if (digits.length !== 11) {
    return { ok: false, digits, error: "Telefone incompleto. Use (99) 99999-9999" };
  }

  const ddd = parseInt(digits.slice(0, 2), 10);
  if (!VALID_DDDS.has(ddd)) {
    return { ok: false, digits, error: "DDD inválido" };
  }
  if (digits[2] !== "9") {
    return { ok: false, digits, error: "Número de celular deve começar com 9" };
  }
  if (/^(\d)\1+$/.test(digits)) {
    return { ok: false, digits, error: "Número inválido" };
  }
  return { ok: true, digits };
}

// Synthetic email used to bridge phone+PIN into Supabase Auth (password grant).
export function phoneToSyntheticEmail(digits: string): string {
  return `br${digits}@phone.futquick.app`;
}

export function validatePin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}
