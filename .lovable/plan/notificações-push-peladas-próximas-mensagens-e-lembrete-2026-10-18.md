# Notificações push: peladas próximas, mensagens e lembrete

## Como funciona hoje
- O app já envia notificações no celular (web push): o usuário toca em "Ativar notificações" e o aparelho fica registrado.
- Mensagens no chat privado já disparam push (título com o nome de quem enviou e a prévia).
- O raio (2/5/10 km) e a localização do usuário já são salvos no cadastro, mas nenhum aviso é enviado quando uma pelada é criada perto.

## O que vai ser feito
1. **Pelada criada perto de você** — ao criar uma pelada, todos os usuários num raio de 5 km (ou o raio que cada um escolheu, limitado a 5 km se preferir) recebem push "Nova pelada perto de você", que abre a pelada. Não avisa o próprio organizador, bloqueados nem suspensos.
2. **Nova mensagem** — padronizar o texto para "Você tem uma nova mensagem" no chat privado e também no chat do grupo da pelada (hoje o grupo não envia push). Respeita "Silenciar notificações".
3. **"Verifique as peladas próximas de você"** — lembrete automático (ex.: 1x por dia, à tarde) só para quem tem pelada aberta no raio e não recebeu outro aviso no dia.
4. **Frases centralizadas** — todos os textos ficam num único arquivo para você trocar depois pelas frases definitivas sem mexer no resto.
5. **Convite para ativar** — reforçar o pedido de permissão logo após o cadastro (sem mudar o visual).

## Limites importantes
- No iPhone o push só funciona com o app adicionado à Tela de Início (iOS 16.4+). No Android funciona direto no navegador.
- Na pré-visualização do editor o navegador bloqueia a permissão; testar no app publicado.
- "Nativo" de loja (App Store/Play Store) exigiria empacotar o app separadamente — não incluído aqui.

## Detalhes técnicos
- Função SQL `nearby_users(lat, lng, km)` (Haversine) sobre profiles.latitude/longitude, filtrando notify_radius_km, suspended_at e is_blocked.
- Server fn `notifyNearbyPelada({ peladaId })` chamada em criar.tsx após o insert; também no cron de peladas recorrentes. Usa notifyUser com dedupeKey `nearby:<peladaId>:<userId>`.
- `notifyGroupMessage({ messageId })` chamado em grupo.$peladaId.tsx após enviar; notifica membros exceto o remetente.
- Novo cron `/api/public/cron/nearby-reminder` (pg_cron diário) com dedupeKey `nearby-reminder:<data>`.
- `src/lib/notification-copy.ts` com todos os títulos/textos + teste do raio de 5 km.
