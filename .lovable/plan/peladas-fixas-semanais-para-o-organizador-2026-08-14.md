# Peladas fixas (semanais) para o organizador

Objetivo: quem cria a pelada pode marcá-la como fixa (ex.: toda quinta, 20h). O app passa a recriar a pelada automaticamente a cada semana e o organizador também pode repetir manualmente com 1 toque. A opção só aparece para o organizador (dono da pelada).

## O que o organizador vê

1. **Na tela da pelada que ele criou** — novo bloco "Pelada fixa":
   - Botão "Fixar toda [dia da semana]" (usa o dia/hora da própria pelada).
   - Quando já está fixa: mostra "Fixa toda quinta · 20:00", botão "Repetir agora" (cria a próxima data já preenchida) e "Desfixar".
2. **No perfil** — nova seção "Minhas peladas fixas", acima do histórico de peladas criadas:
   - Lista dos modelos fixos (nome, dia da semana, horário, local).
   - Ações por item: "Criar próxima" e "Desativar".
   - No histórico de peladas criadas, quem veio de um modelo fixo ganha um selo "Fixa".
3. **No formulário de criação** (passo 2) — checkbox "Repetir toda semana neste dia e horário".

Nada disso aparece para jogadores que não são o organizador.

## Como a repetição funciona

- Ao fixar, guardamos um **modelo** com todos os dados da pelada (nome, descrição, local, coordenadas, tipo de campo, nível, vagas, valor, foto, aprovação automática, dia da semana, horário).
- **Automático:** uma rotina diária verifica os modelos ativos e, quando falta pouco para o próximo dia da semana (janela de 7 dias à frente), cria a pelada daquela data se ainda não existir. Sem duplicar.
- **Manual:** "Repetir agora" / "Criar próxima" cria imediatamente a próxima ocorrência a partir do modelo.
- Desativar o modelo não apaga as peladas já criadas.
- A foto do modelo é reaproveitada, então não gasta geração de imagem por IA a cada semana.

## Detalhes técnicos

**Banco (migração):**
- Nova tabela `pelada_templates`: `organizer_id`, `name`, `description`, `location_name`, `address`, `city`, `latitude`, `longitude`, `weekday` (0-6), `time_of_day` (time), `duration_minutes`, `total_slots`, `price_cents`, `field_type`, `level`, `photo_url`, `auto_approve`, `active`, `last_generated_for` (date), timestamps + trigger `update_updated_at_column`.
- GRANTs: `SELECT, INSERT, UPDATE, DELETE` para `authenticated`; `ALL` para `service_role`. RLS habilitada com políticas escopadas em `auth.uid() = organizer_id` (dono lê/cria/edita/apaga o próprio modelo).
- `peladas` ganha `template_id uuid null references public.pelada_templates(id) on delete set null` (usado para o selo "Fixa" e para evitar duplicatas).

**Server functions (`src/lib/pelada-templates.functions.ts`, com `requireSupabaseAuth`):**
- `pinPelada({ peladaId })` — cria o modelo a partir da pelada e vincula `template_id`.
- `unpinTemplate({ templateId })` — `active = false`.
- `createNextFromTemplate({ templateId })` — calcula a próxima data do `weekday`+`time_of_day` (fuso America/Fortaleza), insere a pelada, atualiza `last_generated_for`; retorna o id para navegação.
- Geração automática: rota pública `src/routes/api/public/cron/recurring-peladas.ts` protegida por header secreto (`RECURRING_CRON_SECRET`), que percorre modelos ativos com `supabaseAdmin` (import dentro do handler) e cria as ocorrências faltantes. Agendada via pg_cron chamando a URL estável do projeto.

**Frontend:**
- `src/routes/_authenticated/pelada.$peladaId.tsx`: bloco "Pelada fixa" renderizado apenas quando `pelada.organizer_id === user.id`.
- `src/routes/_authenticated/perfil.tsx`: query dos modelos ativos + seção "Minhas peladas fixas"; selo "Fixa" no histórico.
- `src/routes/_authenticated/criar.tsx`: checkbox de repetição semanal no passo 2; ao salvar com a opção marcada, cria o modelo junto.
- Helper de dia da semana em `src/lib/pelada-utils.ts` (`WEEKDAY_LABEL`, `nextOccurrence`).
- Design mantido: mesmos tokens (navy/cyan), cartões `rounded-2xl`, tipografia atual.

Passo extra: adicionar o segredo `RECURRING_CRON_SECRET` no backend antes de agendar a rotina automática.
