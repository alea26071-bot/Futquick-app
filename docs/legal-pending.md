# Termos e Privacidade — pendências antes da versão final

Status: **RASCUNHO / EM REVISÃO**. Constantes e textos em `src/lib/legal.ts`.
Enquanto `LEGAL_PENDING` tiver algum `false`, o app publicado bloqueia "Concordar e concluir cadastro" (preview/dev liberado com aviso).

1. Preencher `[NOME COMPLETO DO RESPONSÁVEL 1]` e `[NOME COMPLETO DO RESPONSÁVEL 2]` (controladores conjuntos).
2. Preencher `[E-MAIL DE PRIVACIDADE A DEFINIR]`.
3. **CRÍTICO — menores:** o cadastro aceita idade a partir de 8 anos. Antes de liberar o cadastro público para menores é preciso definir política de menores, consentimento específico e verificável do responsável legal para crianças (LGPD art. 14), melhor interesse e salvaguardas (chat, localização, encontros presenciais). A tela atual NÃO resolve isso.
4. Confirmar itens marcados "A CONFIRMAR": fornecedores e países, retenção pós-exclusão, prazo de resposta, analytics, localização em segundo plano, marketing, fluxo de exclusão de conta.
5. Revisão jurídica. Ao mudar texto relevante, aumentar `TERMS_VERSION`/`PRIVACY_VERSION`.

Registro: tabela `legal_acceptances` (versões + `accepted_at` do servidor, único por usuário/versões, sem IP). Um trigger impede marcar o cadastro como concluído sem aceite.

## Itens a auditar (revisão 2)
- Logs técnicos dos provedores (IP, aparelho) e suas políticas.
- Compartilhamentos e lista de fornecedores/países.
- Medidas de segurança efetivas (controle de acesso, privacidade das fotos) — descrever só após auditoria.
- Localização em tempo real nas conversas privadas: funcionamento e retenção.
- Analytics, anúncios (hoje desativados) e retenção de cada tipo de dado.
- Ao mudar TERMS_VERSION/PRIVACY_VERSION, criar migration atualizando `require_legal_acceptance` com o novo par.

## Atualização (nov/2026)
- Preenchidos: responsável principal Eugenio Gomes Teixeira Filho; coadministrador Pedro Augusto de Souza Duarte; e-mail futquick.oficial@gmail.com; operação por pessoas físicas, sem CNPJ.
- Continuam pendentes (bloqueiam conclusão no app publicado/APK): política para menores de 18 anos (`minorsPolicyConfirmed`) e revisão final dos textos (`legalTextsReviewed`): papéis LGPD/bases legais, retenção, fornecedores, prazo de exclusão, analytics, anúncios.
