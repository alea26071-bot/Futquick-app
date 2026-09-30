# Pelada como grupo/evento — plano incremental

Regra: nenhum layout existente é redesenhado. Tudo é adicionado usando os componentes, cores e cards atuais. O que já existe é reaproveitado (solicitações, seguidores, mapa, notificações push, painel adm).

## Fase 1 — Participação e grupo (núcleo)
- **Entrada**: reaproveitar o "Quero participar" atual e a opção de aprovação automática que já existe. Estados no botão: Quero participar → Solicitação enviada → Você entrou na pelada. Bloqueio no banco contra vaga dupla e contra entrar em pelada lotada.
- **Sair da pelada**: botão na tela da pelada; libera a vaga, corta o acesso ao grupo, mantém o histórico.
- **Chat do grupo**: um grupo por pelada, só para confirmados + organizador (bloqueado também no banco). Reaproveita a tela de chat atual (texto, foto, localização, leitura). As conversas 1:1 atuais continuam funcionando.
- **Informações do grupo**: foto, nome, membros, status, organizador, mapa com "Abrir no mapa" e a lista de jogadores já existente (com a estrela verde de quem você segue).
- **Status**: Aberta / Solicitação pendente / Lotada / Encerrada, coerente em cards, mapa, detalhes e grupo.

## Fase 2 — Descoberta
- Alternância **MAPA | LISTA** no topo da tela Descobrir (mesmo estilo dos filtros atuais), levando ao mapa existente.
- Toque no marcador do mapa mostra resumo: nome, horário, local, participantes/vagas, distância, status e botão "Ver pelada".
- Cards mostram amigos que vão ("⭐ João e mais 2").

## Fase 3 — Organizador
- Editar data, horário, local, vagas e modo de entrada; aceitar/recusar; remover participante; encerrar; apagar mensagens do grupo; transferir organização. Tudo validado no banco.

## Fase 4 — Notificações
- Avisos: entrou na pelada, alguém entrou/solicitou, nova mensagem no grupo, local/horário alterado, pelada lotada, vaga liberada (lista de espera).
- Botão **Silenciar notificações** por pelada.

## Fase 5 — Segurança
- Denunciar pelada, usuário e mensagem (menu ⋮), com motivos listados.
- Bloquear usuário: impede mensagens, convites e interação direta.
- Base para moderação: denúncias visíveis no painel adm atual, suspensão de usuário, remoção de peladas/mensagens.

## Fase 6 — Lista de espera e repetir
- Quando lotada (e se o organizador habilitar): "Entrar na lista de espera"; ao abrir vaga, o próximo é avisado e pode entrar.
- "Repetir esta pelada": cria uma nova pelada copiando local, tipo, vagas e descrição.

## Detalhes técnicos
- Reaproveitar `pelada_requests` como participações/solicitações (status: pending, accepted, rejected, cancelled, removed, waitlist) — sem criar tabela duplicada.
- Novas tabelas: `pelada_group_messages` (RLS: só membros aceitos/organizador leem e enviam; organizador/adm apagam), `pelada_mutes`, `user_blocks`, `reports` (alvo: pelada | user | message, motivo, status, revisor), coluna `waitlist_enabled` e `organizer_id` transferível em `peladas`, `suspended_at` em `profiles`.
- Funções `SECURITY DEFINER`: `is_pelada_member`, `join_pelada` (vaga atômica + anti-duplicidade), `leave_pelada` (promove lista de espera), `transfer_pelada`, `is_blocked`.
- Notificações via `notifyUser` existente, respeitando `pelada_mutes`.
- Verificação final: criação, mapa, localização, participação, perfis, seguidores, login, navegação e visual em celular.

Sugestão: executar em 2–3 entregas (Fases 1–2, depois 3–4, depois 5–6) para testar cada parte sem quebrar o que já funciona.
