# Plano técnico — Push nativo Android e iOS com Capacitor (mantendo Web Push)

Nada foi alterado. Inspecionado: dependências, `public/sw.js`, `src/lib/push-client.ts`, `web-push.server.ts`, `notifications.server.ts`, `social-push.server.ts`, tabela `push_subscriptions`, `GoogleMap.tsx`, `LocationPicker.tsx`, `mapa.tsx`, `descobrir.tsx`. 60 testes existentes passaram.

## Estado real
- Não há Capacitor, `android/`, `ios/`, Firebase, APNs nem plugin de push nativo.
- Web Push: `push_subscriptions` (user_id, endpoint único, p256dh, auth); envio VAPID no servidor; inscrições 404/410 já são apagadas; clique abre `data.url` (padrão `/descobrir`).
- Mapa: Google Maps JS carregado por script com chave de navegador do conector Google Maps; localização via `navigator.geolocation` (só em primeiro plano).
- Ponto crítico: o app é renderizado no servidor (TanStack Start) e usa funções de servidor. O Capacitor não empacota isso como arquivos estáticos. Caminho recomendado: app nativo abre o site publicado (`server.url` = domínio publicado), com o plugin nativo habilitado para esse domínio. Consequência: precisa de internet (já precisa hoje) e updates de tela chegam sem nova versão na loja.

## Arquitetura de entrega sem duplicidade
```text
Evento (jogo próximo, mensagem, lembrete, social)
  -> notifications.server.ts monta título/texto/url (textos já centralizados)
  -> para cada dispositivo do usuário:
       plataforma web     -> Web Push (VAPID)  [atual]
       plataforma android -> FCM HTTP v1
       plataforma ios     -> FCM HTTP v1 -> APNs
```
Regras: dentro do app nativo NÃO registrar Web Push nem service worker (detectar `Capacitor.isNativePlatform()`); ao registrar token nativo, apagar inscrição web do mesmo aparelho se existir; uma tag/`collapse_key` por destino; deduplicação por (evento, dispositivo).

## Banco (migração futura)
- Nova tabela `push_devices`: user_id, platform (android|ios), token FCM único, app_version, device_id local, last_seen_at, created_at. RLS: dono lê/insere/apaga o próprio; envio via servidor.
- Alternativa: estender `push_subscriptions` com `platform` e `fcm_token` (endpoint/p256dh opcionais). Tabela separada é mais limpa.

## Código que a Lovable implementa
- Dependências: `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`, `@capacitor/push-notifications` (ou `@capacitor-firebase/messaging` para token FCM também no iOS — recomendado), `@capacitor/app` (deep links), `@capacitor/local-notifications` (exibir em primeiro plano, opcional).
- `capacitor.config.ts` (appId, appName, `server.url`, `allowNavigation`).
- `src/lib/native-push.ts`: pedir permissão no mesmo momento do aviso atual pós-cadastro; obter token; salvar via função de servidor autenticada; ouvir renovação de token; remover no logout.
- `push-client.ts`: pular Web Push quando nativo.
- Servidor: `fcm.server.ts` enviando via conector Firebase Cloud Messaging; integrar em `notifications.server.ts` e `social-push.server.ts`; apagar tokens com `UNREGISTERED`/`INVALID_ARGUMENT`; respeitar silenciamento, raio de 5 km e exclusões já existentes.
- Estados do app:
  - primeiro plano: evento `pushNotificationReceived` -> toast/aviso no app (sem notificação de sistema duplicada) e atualizar sino.
  - segundo plano/fechado: sistema mostra a notificação (payload `notification` + `data.url`).
  - toque: `pushNotificationActionPerformed` -> navegar para `data.url` (`/pelada/:id`, `/chat/:id`, `/notificacoes`, `/descobrir`).
- Deep links: App Links Android (`/.well-known/assetlinks.json`) e Universal Links iOS (`apple-app-site-association`) servidos pelo site.
- Limpeza: token removido no logout, na exclusão de conta, em erro do FCM e se `last_seen_at` > 60 dias (rotina horária existente).
- Testes automatizados: escolha de canal por plataforma, deduplicação, remoção de token inválido, montagem de URL de destino.

## O que exige ação externa (você)
- Firebase Console: criar projeto, app Android (pacote, SHA-256) -> `google-services.json`; app iOS -> `GoogleService-Info.plist`; conta de serviço para o conector FCM.
- Apple Developer (US$99/ano): App ID com Push Notifications e Associated Domains, chave APNs `.p8` (Key ID, Team ID) enviada ao Firebase, perfis de assinatura.
- Mac com Xcode: `npx cap add ios`, ativar capabilities Push + Background Modes (remote notifications), build e envio ao TestFlight. Não roda na Lovable.
- Android Studio/JDK: `npx cap add android`, canal de notificação padrão, ícone monocromático, keystore, gerar AAB, Play Console (US$25).
- Na Lovable: conectar Firebase Cloud Messaging (segredo no servidor) — só após sua autorização.
- Fluxo de build: exportar código para GitHub -> clonar -> `npm install` -> `npx cap sync` -> abrir no Android Studio/Xcode.

## Permissões
- Android 13+: `POST_NOTIFICATIONS` em tempo de execução; localização `ACCESS_FINE/COARSE_LOCATION`.
- iOS: pedido de notificações em tempo de execução; `NSLocationWhenInUseUsageDescription` no Info.plist.
- Sem localização em segundo plano (não necessária: proximidade usa a cidade/coordenadas salvas no perfil).

## Google Maps no Capacitor/WebView
- Funciona: o mapa é JS carregado em página web. Com `server.url` no domínio publicado, a origem continua `https://futquick-app.lovable.app`, então restrição de chave por referenciador (HTTP referrer) continua válida.
- Se no futuro empacotar arquivos locais, a origem vira `https://localhost` (Android) e `capacitor://localhost` (iOS): seria preciso liberar esses referenciadores ou usar chave separada — menos seguro.
- Verificar no Google Cloud: referenciadores permitidos incluem o domínio publicado; Places e Geocoding ativos.
- Localização: `navigator.geolocation` funciona no WebView desde que as permissões nativas estejam no manifesto/Info.plist; recomendado trocar por `@capacitor/geolocation` no nativo para pedido de permissão confiável.
- Não verificado: comportamento real em aparelho.

## Ordem
1. Decidir pacote/Bundle ID (ex.: `app.futquick`) e confirmar Firebase + Apple Developer.
2. Lovable: Capacitor + config + detecção nativa + tabela de dispositivos + envio FCM + deep links + testes.
3. Você: gerar projetos Android/iOS, colocar arquivos do Firebase, chave APNs, buildar.
4. Teste com dois aparelhos: primeiro plano, segundo plano, fechado, toque abrindo tela certa, logout limpando token, sem notificação dupla com Web Push no mesmo aparelho.

## Não verificado
Entrega real de push (web ou nativo), mapas em WebView, links profundos, contas Firebase/Apple.
