# Seguidores e atividade social

## Reaproveitado
- `user_follows`, com chave composta e restrição existente contra auto-follow.
- Perfis próprio e de visitantes, componentes de botão, campo, switch e painel inferior.
- `notifications`, índice único de deduplicação, sino e tela de avisos.
- Inscrições em `pelada_requests`, confirmação automática, aprovação e inclusão pelo responsável.
- Envio Web Push/VAPID, subscriptions, worker de mensagens e silenciamento por jogo.
- Agendamento horário existente de lembretes, também utilizado para retentar a fila social.

## Implementação
- `ProfileSocial.tsx`: contagens, listas de 20 usuários por página, busca e seguir/deixar de seguir; integração nos dois perfis sem alterar os três cartões de reputação.
- `social.functions.ts` e RPC `social_profile_list`: autenticação, consulta de colunas sociais seguras, ocultação de bloqueados/suspensos e interseção visitante→conhecido→perfil visitado. Máximo de dois nomes na apresentação, total adicional e lista filtrada.
- `FollowActivityPreference.tsx`: controle independente em Notificações; persistência em `profiles.notify_follow_activity`, inicialmente habilitado.
- Trigger de `pelada_requests`: apenas transição para `accepted` em jogo futuro aberto/lotado gera aviso. Pedidos pendentes, perfis sem coordenadas, não seguidores, bloqueados, suspensos e preferência desligada são excluídos.
- Proximidade mantém a regra existente: Haversine em km, raio escolhido limitado a 5 km. Não inventa localização; raio nulo usa os 5 km existentes.
- Deduplicação por destinatário, participante e jogo. O aviso identifica o participante e abre `/pelada/<id>`.
- Fila `social_push_queue` exclusiva de serviço, sem permissões de usuários comuns. Criação ocorre na mesma transação que a participação e o aviso.
- `social-push.server.ts`: claim transacional, rechecagem de relacionamento/preferência/bloqueios/silenciamento, subscriptions inválidas removidas e tentativa posterior em falhas. Hashes dos aparelhos com envio aceito impedem repetir nesses aparelhos nas retentativas. Avisos com mais de 24h não têm push atrasado. Aceitação pelo provedor não comprova exibição no dispositivo.
- Migrações aditivas `0015`–`0018` preservam dados; mudanças não excluem tabelas ou colunas existentes. A última migração impede trocar o usuário/jogo de uma solicitação para forjar participação.

## Configuração e limites
- As variáveis VAPID pública e privada já estão disponíveis no servidor; nenhuma credencial nova foi criada ou colocada no cliente.
- Não publicado nesta tarefa. Publicar é necessário para disponibilizar os novos handlers e a retentativa horária no domínio publicado.
- Android: o navegador/sistema decide entrega, som e heads-up conforme permissões e canais; o app não pode forçá-los.
- iOS: Web Push requer app na Tela de Início e iOS/iPadOS 16.4+, além da permissão.
- Esta implementação é Web Push/PWA, não push nativo FCM/APNs de aplicativo de loja.
- Teste físico pendente: duas contas, seguir a conta participante, localização real dentro do raio, preferência ativa e autorização de push; confirmar participação em jogo futuro, abrir aviso e verificar destino. Repetir com preferência desligada e não seguidor.
- Uma interrupção entre aceitação do push pelo provedor e gravação do hash ainda pode ocasionar reenvio; não há garantia de exatamente uma entrega entre banco e provedor externo.

## Verificações
- Treze testes automatizados: validação dos modos/paginação, raio, distância, textos existentes, horário de Brasília, opções do worker e regressões de reputação.
- SQL transacional com rollback: conhecidos em comum, direção dos relacionamentos, ausência de telefone/e-mail, auto-follow, duplicidade, criar/remover apenas relação própria, entrada pendente sem aviso, confirmação forjada negada, preferência, raio, não seguidores, destino, deduplicação, fila privada e identidade da solicitação.
- Navegador autenticado com conta temporária: seguir perfil real, contagem própria, busca da lista, deixar de seguir, preferência após reload, visual mobile e ausência de erros JavaScript. Relação de teste removida; demais dados existentes preservados.
- A conta do solicitante estava com cadastro incompleto; não foi alterada para contornar esse fluxo.
- Push chegando em celular, conhecidos em comum com relações reais múltiplas e paginação preenchida com mais de 20 seguidores não foram simulados; regras e paginação estão implementadas e a autorização foi testada no banco.