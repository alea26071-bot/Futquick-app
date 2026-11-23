// Versões e status dos documentos legais — ÚNICO local para alterar.
export const TERMS_VERSION = "1.0";
export const PRIVACY_VERSION = "1.0";

/**
 * PENDÊNCIAS QUE IMPEDEM A VERSÃO FINAL (ver docs/legal-pending.md).
 * Enquanto alguma estiver aberta os documentos aparecem como RASCUNHO e o botão
 * de conclusão fica bloqueado no app publicado. Preencha os dados reais e mude
 * para `true` somente após revisão dos responsáveis.
 */
export const LEGAL_PENDING = {
  responsibleNamesFilled: false, // [NOME COMPLETO DO RESPONSÁVEL 1/2]
  privacyEmailFilled: false, // [E-MAIL DE PRIVACIDADE A DEFINIR]
  minorsPolicyConfirmed: false, // política de menores + consentimento verificável do responsável legal
} as const;

export const RESPONSIBLE_1 = "[NOME COMPLETO DO RESPONSÁVEL 1]";
export const RESPONSIBLE_2 = "[NOME COMPLETO DO RESPONSÁVEL 2]";
export const PRIVACY_EMAIL = "[E-MAIL DE PRIVACIDADE A DEFINIR]";

export function isLegalDraft(p: { [K in keyof typeof LEGAL_PENDING]: boolean } = LEGAL_PENDING): boolean {
  return !(p.responsibleNamesFilled && p.privacyEmailFilled && p.minorsPolicyConfirmed);
}

/** Preview/dev permite testar com rascunho; o app publicado (e o app nativo, que carrega o site publicado) não. */
export function isLegalTestEnvironment(hostname: string, dev = false): boolean {
  if (dev) return true;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("id-preview--") || hostname.includes("-preview--");
}

export function canFinishWithLegal(opts: {
  accepted: boolean; termsViewed: boolean; privacyViewed: boolean; draft: boolean; testEnv: boolean;
}): boolean {
  if (!opts.accepted || !opts.termsViewed || !opts.privacyViewed) return false;
  if (opts.draft && !opts.testEnv) return false;
  return true;
}

export type LegalSection = { title: string; body: string[] };
export type LegalDoc = { title: string; version: string; sections: LegalSection[] };

export const TERMS_DOC: LegalDoc = {
  title: "Termos de Uso",
  version: TERMS_VERSION,
  sections: [
    { title: "1. Sobre o Futquick", body: [
      `O Futquick é um aplicativo para encontrar, criar e organizar jogos esportivos presenciais (peladas e outras modalidades). É mantido por ${RESPONSIBLE_1} e ${RESPONSIBLE_2}, que decidem em conjunto sobre o serviço.`,
      "Ao concluir o cadastro, você declara que leu e concorda com estes Termos." ] },
    { title: "2. Cadastro e conta", body: [
      "Você deve informar dados verdadeiros (nome, idade, região e foto) e manter seu PIN ou login Google em sigilo. A conta é pessoal e intransferível.",
      "Uso por menores de idade: A CONFIRMAR. As regras para menores e o consentimento do responsável legal ainda estão sendo definidos e serão incluídos antes da liberação pública para esse público." ] },
    { title: "3. Participar de jogos", body: [
      "Ao entrar ou solicitar vaga, você se compromete a comparecer ou sair da lista com antecedência, respeitar horário, local, valor combinado e as regras do organizador.",
      "Pagamentos combinados entre participantes e organizadores acontecem fora do Futquick; o app não processa nem garante pagamentos." ] },
    { title: "4. Organizar jogos", body: [
      "Quem organiza é responsável pelas informações do jogo (local, horário, vagas, preço e nível), por aprovar ou remover participantes, confirmar presença e atribuir notas de postura com honestidade.",
      "Organizadores podem criar jogos fixos dentro dos limites do app e devem cancelar com aviso quando o jogo não acontecer." ] },
    { title: "5. Conduta e respeito", body: [
      "Não são permitidos assédio, discriminação, ameaças, violência, linguagem ofensiva, golpes, spam, perfis falsos ou uso do app para fins ilegais.",
      "As avaliações de nível e postura devem refletir o que aconteceu no jogo, sem retaliação ou combinação de notas." ] },
    { title: "6. Conteúdo que você envia", body: [
      "Fotos, mensagens, localização compartilhada no chat e descrições são de sua responsabilidade. Não envie conteúdo de terceiros sem autorização nem conteúdo impróprio.",
      "Você permite que o Futquick exiba esse conteúdo aos demais usuários conforme o funcionamento do app (perfil, jogos e conversas)." ] },
    { title: "7. Segurança em encontros presenciais", body: [
      "Os jogos acontecem fora do app. Prefira locais conhecidos e públicos, avise alguém de confiança, respeite seus limites físicos e as regras do local.",
      "O Futquick não verifica identidade, antecedentes ou condições de saúde dos participantes nem a segurança dos locais." ] },
    { title: "8. Denúncias, bloqueios e moderação", body: [
      "Você pode denunciar jogos, perfis e mensagens e bloquear outros usuários. Denúncias são analisadas pela administração.",
      "Em caso de violação, podemos remover conteúdo, suspender ou encerrar contas, de forma proporcional e, quando possível, informando o motivo." ] },
    { title: "9. Encerramento da conta", body: [
      `Você pode pedir a exclusão da sua conta a qualquer momento pelo contato ${PRIVACY_EMAIL}. O prazo e o fluxo de exclusão estão A CONFIRMAR.` ] },
    { title: "10. Disponibilidade e responsabilidades", body: [
      "Trabalhamos para manter o app funcionando, mas ele pode passar por falhas, manutenções e mudanças. Notificações podem atrasar ou não chegar, dependendo do aparelho.",
      "O Futquick não se responsabiliza por condutas de usuários nem pelo que ocorre nos jogos, sem prejuízo dos direitos garantidos pelo Código de Defesa do Consumidor e demais leis. Nada nestes Termos afasta direitos que a lei garante a você." ] },
    { title: "11. Alterações e contato", body: [
      "Podemos atualizar estes Termos; mudanças relevantes serão informadas no app e poderá ser pedido novo aceite.",
      `Contato: ${PRIVACY_EMAIL}. Aplica-se a legislação brasileira.` ] },
  ],
};

export const PRIVACY_DOC: LegalDoc = {
  title: "Política de Privacidade",
  version: PRIVACY_VERSION,
  sections: [
    { title: "1. Quem é responsável", body: [
      `${RESPONSIBLE_1} e ${RESPONSIBLE_2}, fundadores do Futquick, decidem em conjunto sobre o tratamento dos seus dados e atuam como controladores conjuntos, nos termos da LGPD (Lei 13.709/2018).`,
      `Canal de privacidade: ${PRIVACY_EMAIL}.` ] },
    { title: "2. Dados que coletamos", body: [
      "Cadastro: nome, telefone (ou conta Google com nome e e-mail), idade, estado, cidade, raio de interesse e foto de perfil. O PIN é usado para login e não é exibido a ninguém.",
      "Perfil e social: bio, fotos de capa, termo regional preferido (Pelada, Baba, Rachão...), quem você segue e quem te segue.",
      "Jogos: jogos criados, solicitações, participações, presença confirmada, curtidas, avaliações de nível (estrelas) e de postura.",
      "Conversas: mensagens, fotos e localização que você decide enviar no chat do jogo ou em conversas privadas, além de localização ao vivo quando você a ativa.",
      "Segurança: denúncias, bloqueios e registro do seu aceite destes documentos (versões e data/hora do servidor). Não registramos seu IP nem identificação do aparelho nesse aceite." ] },
    { title: "3. Localização", body: [
      "Com sua permissão, usamos a localização do aparelho para mostrar e avisar sobre jogos próximos. Você pode continuar sem ela.",
      "Localização em segundo plano: A CONFIRMAR. Hoje a localização é usada quando o app está aberto ou quando você compartilha no chat." ] },
    { title: "4. Para que usamos", body: [
      "Criar e manter sua conta; mostrar jogos e perfis; permitir entrar, organizar e conversar; calcular reputação; enviar notificações; prevenir abusos e cumprir obrigações legais.",
      "Uso para marketing: A CONFIRMAR. Não enviaremos marketing sem informar antes." ] },
    { title: "5. O que outros usuários veem", body: [
      "Seu nome, foto, cidade, bio, capas, estatísticas, reputação, seguidores e jogos aparecem para outros usuários do app. Mensagens são vistas pelos participantes da conversa." ] },
    { title: "6. Notificações", body: [
      "Com sua permissão, enviamos avisos de jogos próximos, mensagens, lembretes e atividade de quem você segue, pelo navegador ou pelo app. Você pode desativar nas configurações do aparelho e algumas no próprio perfil." ] },
    { title: "7. Compartilhamento e fornecedores", body: [
      "Usamos fornecedores para hospedagem, banco de dados, armazenamento de fotos, login com Google, mapas, envio de notificações e, no app, anúncios. A lista completa de fornecedores e os países onde os dados são processados está A CONFIRMAR.",
      "Podemos compartilhar dados quando exigido por lei ou ordem de autoridade competente. Não vendemos seus dados." ] },
    { title: "8. Armazenamento local e cookies", body: [
      "O app guarda no seu aparelho informações técnicas necessárias, como a sessão de login e preferências (ex.: tema). Ferramentas de estatística de uso: A CONFIRMAR." ] },
    { title: "9. Retenção", body: [
      "Conversas dos jogos são apagadas automaticamente após o prazo da conversa. Histórico de jogos e avaliações é mantido enquanto a conta existir. Prazos de retenção após exclusão da conta: A CONFIRMAR." ] },
    { title: "10. Segurança", body: [
      "Adotamos medidas técnicas e administrativas razoáveis, como controle de acesso por usuário e fotos privadas com links temporários. Nenhum sistema é totalmente imune a incidentes; se ocorrer um incidente relevante, comunicaremos conforme a LGPD." ] },
    { title: "11. Crianças e adolescentes", body: [
      "PENDENTE: a política para menores de 18 anos, incluindo consentimento específico e verificável de responsável legal para crianças e salvaguardas de melhor interesse, ainda será definida. Esta versão não resolve esse ponto." ] },
    { title: "12. Seus direitos (LGPD)", body: [
      "Você pode pedir confirmação e acesso aos dados, correção, anonimização, bloqueio ou eliminação de dados desnecessários, portabilidade, informação sobre compartilhamentos, revogação de consentimento e revisão de decisões automatizadas. Também pode reclamar à ANPD.",
      `Para exercer seus direitos ou pedir a exclusão da conta, escreva para ${PRIVACY_EMAIL}. Prazo de resposta: A CONFIRMAR.` ] },
    { title: "13. Atualizações", body: [
      "Esta política pode ser atualizada. A versão vigente aparece no topo; mudanças relevantes serão avisadas no app." ] },
  ],
};
