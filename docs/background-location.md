# Localização em segundo plano (preparado, NÃO ativo)

Estado: coluna `profiles.background_location_enabled` (padrão `false`, legível só pelo dono via `my_profile()`). Nenhum plugin, permissão Android ou serviço foi adicionado.

## Por que não foi implementado nativamente agora
- Google Play exige `ACCESS_BACKGROUND_LOCATION` com declaração específica, vídeo de demonstração e uso "essencial ao app"; avisos de jogos próximos raramente são aprovados nesse critério.
- Plugins de background contínuo (ex.: @capacitor-community/background-geolocation) usam serviço em primeiro plano com notificação fixa — alto custo de bateria e risco de reprovação.
- Para adolescentes (13–17) não há política legal definida.

## Caminho recomendado (baixo risco)
1. Atualizar a localização ao abrir o app (já existe no onboarding/descobrir) — sem permissão extra.
2. Se necessário: atualização aproximada (`ACCESS_COARSE_LOCATION`) com WorkManager a cada ≥ 6 h, somente com `background_location_enabled = true`, explicação prévia na tela e opção de desligar no perfil; bloqueado para menores de 18.
3. Gravar apenas latitude/longitude e `location_updated_at` do próprio perfil (nunca no chat, nunca exibido no perfil).
