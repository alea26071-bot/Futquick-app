# Futquick — apps Android e iOS (Capacitor)

Identificador permanente: `com.futquick.app` · Nome: Futquick · Capacitor 8.

## Arquitetura escolhida
O Futquick renderiza páginas no servidor e usa funções de servidor (login, dados, push, rotinas).
Isso não pode ser empacotado como site estático sem reescrever o app. Por isso o app nativo abre o site
publicado (`server.url = https://futquick-app.lovable.app`) dentro do WebView, com plugins nativos ativos.

Consequências / riscos:
- Precisa de internet (já precisava). Sem rede aparece a tela `native-shell/index.html`.
- Mudanças de telas publicadas chegam ao app sem nova versão na loja; mudanças nativas (plugins, permissões, ícones) exigem novo build.
- Sessão e cookies ficam no WebView do app, separados do navegador do celular.
- **Login com Google dentro do WebView é bloqueado pelo Google** (`disallowed_useragent`). Login por telefone/PIN funciona. Para Google no app é preciso login nativo (pendente, próxima etapa).
- `allowNavigation` só libera o domínio do app e hosts do Google/backend.
- Apple pode recusar apps que sejam "apenas um site"; push, anúncios nativos e permissões ajudam, mas não garantem aprovação.

## Push
- Navegador: Web Push + `public/sw.js` (inalterado).
- App: `@capacitor-firebase/messaging` (FCM no Android, FCM→APNs no iOS). Escolhido em vez de `@capacitor/push-notifications` porque entrega token FCM também no iOS, permitindo um único envio pelo servidor.
- Tokens: tabela `push_devices` (RLS: só o dono). Registro via `register_push_device` (troca de conta no mesmo aparelho reatribui o token).
- Sem duplicidade: o WebView do app não tem Web Push, então cada aparelho recebe por um único canal. Fila social registra aparelhos já atingidos.
- Envio: `notifyUser` (convites, pedidos, chat, jogos próximos, lembretes) e push social também enviam para `push_devices`. Silenciamento, exclusões e textos genéricos são os mesmos.
- Tokens inválidos são apagados; logout apaga o token do aparelho.
- Primeiro plano: aviso dentro do app. Segundo plano/fechado: notificação do sistema. Toque: abre `data.url` (só caminhos do próprio app).
- Android: canal `futquick_default` de alta importância, som padrão, vibração curta. O usuário pode silenciar no sistema; o app não ignora isso.

## Anúncios (AdMob)
- `@capacitor-community/admob` (nativo). Desligado por padrão (`VITE_ADMOB_ENABLED` ausente).
- Somente IDs oficiais de teste do Google estão no projeto.
- Consentimento Google UMP antes de qualquer anúncio; sem consentimento → anúncios não personalizados ou nenhum.
- Banner adaptativo só na tela Descobrir, acima da barra inferior, com espaço reservado. Intersticial/recompensado: não usados.

## Mapa e localização
- Google Maps JS funciona no WebView; a origem continua o domínio publicado, então a restrição da chave por site segue válida.
- Localização usa `navigator.geolocation`; o Capacitor converte em pedido nativo de permissão. Permissões declaradas no Android e texto no iOS.

## Passos externos (você)
1. Firebase Console: criar projeto → app Android `com.futquick.app` (com SHA-256 da chave de assinatura) → baixar `google-services.json` para `android/app/`.
2. Firebase → app iOS `com.futquick.app` → `GoogleService-Info.plist` em `ios/App/App/` (adicionar no Xcode).
3. Conectar **Firebase Cloud Messaging** no Lovable (Conectores) com a conta de serviço — nunca colar no chat.
4. Apple: chave APNs `.p8` enviada no Firebase (Configurações → Cloud Messaging). Xcode: capabilities Push Notifications e Background Modes → Remote notifications.
5. AdMob: criar app e blocos; informar App ID real (Android `strings.xml` `admob_app_id`, iOS `GADApplicationIdentifier`) e `VITE_ADMOB_BANNER_ANDROID/IOS`, depois `VITE_ADMOB_ENABLED=true`. Publicar `app-ads.txt` no domínio.

## Comandos
```bash
git clone <repo> && cd futquick && npm install
npx cap sync
# Android
npx cap open android            # Android Studio: Build > Generate Signed App Bundle (.aab)
cd android && ./gradlew bundleRelease   # requer keystore configurado
# iOS (Mac)
npx cap open ios                # Xcode: Signing & Capabilities, Product > Archive
```

## Checklist das lojas
- Política de privacidade pública e Termos (pendentes; dados do responsável necessários).
- Exclusão de conta dentro do app e página web de exclusão (pendente).
- Play Console: Segurança dos dados (localização, fotos, telefone, ID de anúncios), "Contém anúncios", classificação etária, público-alvo.
- App Store: rótulos de privacidade, ATT se anúncios personalizados, login Google nativo/Sign in with Apple se houver login social.

## Não testado
Nenhum build nativo foi compilado aqui (sem Android SDK/Xcode). Push nativo e AdMob não estão operacionais até build em aparelho e credenciais/IDs reais.
