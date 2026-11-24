/** Converte erros do cadastro em mensagens úteis, sem expor dados pessoais. */
export type SaveStage = "acceptance" | "profile";

export function describeSaveError(e: unknown, stage: SaveStage): string {
  const err = (e ?? {}) as { code?: string; message?: string; status?: number };
  const code = err.code ?? "";
  const msg = String(err.message ?? "");
  if (/failed to fetch|network|load failed/i.test(msg)) return "Sem conexão com o servidor. Verifique sua internet e tente de novo.";
  if (code === "23505" || /duplicate|unique/i.test(msg)) {
    return stage === "profile" && /phone/i.test(msg)
      ? "Este telefone já está ligado a outra conta. Entre com essa conta ou use outro número."
      : "Este dado já está em uso por outra conta.";
  }
  if (code === "42501" || code === "PGRST301" || err.status === 401 || err.status === 403 || /jwt|permission/i.test(msg))
    return "Sua sessão expirou. Saia e entre novamente para concluir.";
  if (code === "P0001" && /aceite/i.test(msg)) return "Seu aceite dos Termos e da Política não foi confirmado. Toque novamente em concluir.";
  if (code === "P0001" && msg) return msg; // mensagens próprias do app, em português
  if (code === "23514" || code === "22P02") return "Algum dado do cadastro é inválido. Revise idade, região e foto.";
  const ref = code ? ` (código ${code})` : "";
  return stage === "acceptance"
    ? `Não foi possível registrar seu aceite${ref}. Tente novamente.`
    : `Não foi possível salvar seu perfil${ref}. Tente novamente.`;
}
