# Auditoria de prontidão para lançamento — Futquick

Nada foi alterado. Verificado nesta etapa: estrutura de pastas, dependências, rotas, rotinas agendadas, segredos referenciados no código, migrations e 60 testes automatizados (60 passaram, sem tocar em dados).

## 1. Empacotamento Android — estado real
- NÃO existe Capacitor, pasta `android/`, Gradle, AndroidManifest, keystore, AAB/APK nem script de build mobile.
- NÃO existe manifesto PWA (`manifest.webmanifest`) nem ícones de app; só `favicon.ico` e `public/sw.js`. Ou seja, nem TWA (app Play Store baseado no site) está pronto.
- Faltam: escolher caminho (TWA via Bubblewrap/PWABuilder = mais rápido; Capacitor = necessário para AdMob/FCM nativos), manifesto + ícones 512px, `assetlinks.json` em `/.well-known/` (TWA), keystore de assinatura, build AAB em máquina com Android Studio/JDK (não roda na Lovable), conta Google Play Console (US$25), ficha da loja, classificação etária, formulário de Segurança de Dados e política de privacidade pública.

## 2. Web Push hoje e FCM nativo
Existe: `public/sw.js`, tabela `push_subscriptions`, chaves VAPID, envio no servidor, fila social, rotinas `nearby-reminder`, `rating-reminders`, `conversation-maintenance`, `recurring-peladas`.
Não testado: entrega real em celular entre duas contas.
Falta para FCM: projeto Firebase + `google-services.json`, conexão Firebase Cloud Messaging (conta de serviço), plugin `@capacitor/push-notifications`, coluna de plataforma/token nativo em `push_subscriptions`, envio pelo FCM HTTP v1 no servidor.
Sem duplicar: dentro do app nativo, não registrar Web Push (detectar plataforma) e enviar a cada dispositivo um único canal; deduplicação por dispositivo e por tag de notificação.

## 3. AdMob
- Nada existe (sem SDK/plugin). Web/TWA não suporta AdMob nativo; exige Capacitor + `@capacitor-community/admob`.
- Código: inicialização, banner/intersticial em pontos definidos, IDs de teste do Google em desenvolvimento, consentimento UMP (obrigatório para UE/LGPD recomendável), `app-ads.txt` no domínio.
- Conta externa (responsável): criar app no AdMob, App ID (vai no AndroidManifest), Ad Unit IDs, mensagem de consentimento GDPR/US, dados de pagamento, declaração "contém anúncios" no Play Console.

## 4. Dependências do Lovable Cloud e migração
Dependem do Cloud: login telefone/PIN e Google, banco (tabelas, RLS, ~39 funções SQL, triggers), 3 buckets de arquivos, rotinas `pg_cron` chamando as rotas `/api/public/cron/*`, server functions com chave de serviço, VAPID e `LOVABLE_API_KEY` (geração de capas por IA), servidor MCP/OAuth.
Observação: há 13 arquivos em `supabase/migrations` e 19 em `drizzle/migrations`; uma recriação precisa consolidar as duas fontes.
Recomendação: NÃO migrar antes de amanhã. Sem dados reais, migrar depois é barato e o risco agora é quebrar login, push e rotinas na véspera. Se for migrar, fazer antes de ter usuários reais (janela ideal: logo após o teste interno).
Limitações: senhas/PIN de usuários não são exportáveis de forma simples (sem dados reais, recriar contas resolve); IA de capas usa chave Lovable; MCP OAuth depende da Lovable.
Testes obrigatórios pós-migração: cadastro/login PIN e Google, RLS com duas contas, upload e leitura de fotos, criar/entrar/sair de jogo, chat, cada cron, push, admin.

## 5. Tour guiado (primeira entrada)
- Onde: componente novo montado no layout autenticado (`src/routes/_authenticated/route.tsx`), após o guard de onboarding, sem tocar no cadastro de sete etapas.
- Alvos: navegação inferior (Descobrir, Mapa, Criar jogo, Chat, Perfil).
- Persistência: campo no perfil (ex.: `tour_completed_at`) + `localStorage` como cache; botões Pular/Concluir e "Rever tour" no menu de três pontos do perfil.

## 6. Legal e dados
Hoje existe apenas o texto "Ao continuar você concorda com nossos termos" no cadastro, sem link nem página. Exclusão de conta só existe para admin (`admin.functions.ts`).
Criar: rotas públicas `/termos`, `/privacidade`, `/excluir-dados` (exigida pelo Google Play, acessível sem login), checkbox de aceite com data/versão salva no perfil, "Excluir minha conta" no menu do perfil via função autenticada (apaga fotos, mensagens, inscrições de push e usuário), consentimento de anúncios (UMP) e de localização.
Campos que o responsável precisa fornecer: razão social ou nome do titular, CNPJ/CPF, endereço, e-mail de contato e do encarregado (DPO), cidade/foro, idade mínima, prazos de retenção desejados, data de vigência.

## 7. Não verificado
Push real em celular, rotinas no app publicado, login Google no publicado, upload de capas autenticado, build Android (inexistente), conta AdMob/Play Console, configurações de auth hospedadas.

## 8. Ordem realista
Amanhã (viável): teste interno na Play Store via TWA — manifesto+ícones, `assetlinks.json`, páginas Termos/Privacidade/Exclusão, link e aceite no cadastro, exclusão de conta pelo usuário, publicar o site, gerar AAB com Bubblewrap no seu computador. Web Push funciona dentro do TWA no Android.
Atualização seguinte: tour guiado; teste de push entre duas contas; decisão sobre Supabase próprio.
Depois (Capacitor): AdMob + UMP, FCM nativo com deduplicação.
Bloqueios de produção: política de privacidade pública com dados reais do responsável, exclusão de conta pelo usuário, formulário de Segurança de Dados, conta Play Console, assinatura do app, e (para anúncios) Capacitor + conta AdMob aprovada.

## Próximo passo sugerido
Aprovando este plano, começo pela etapa "Amanhã": manifesto/ícones, páginas legais com campos marcados para preencher, aceite no cadastro e exclusão de conta — sem mudar layout.
