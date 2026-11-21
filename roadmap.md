# Roadmap

- [x] Integrar contagens/listas de seguidores, conhecidos em comum e preferência de atividade; relacionamentos/notificações reutilizados, RLS e testes transacionais aprovados, seguir/deixar de seguir e preferência após recarregar conferidos com conta temporária; 13 testes passaram e compilação sem erros.
- [ ] Validar push social em dispositivo no app publicado — depende de publicação e permissão do navegador.

- [x] Implementar reputação com presença confirmada pelo organizador, estrelas entre presentes e postura independente exclusiva do responsável (sem postura no próprio jogo); médias protegidas, histórico preservado e aviso persistente de pendências. Oito testes automatizados passaram; verificações transacionais de permissões, duplicidades, médias e limpeza passaram. Fluxo real de confirmação, estrelas, postura, releitura e desaparecimento do aviso conferido em celular e computador; jogo temporário removido.
- [ ] Validar lembrete horário de avaliações no aplicativo publicado — novo agendamento autenticado configurado e antigo desativado; depende de publicar a versão atual.

- [x] Arredondar a fonte da localização azul, adaptar ícones por esporte, adicionar filtro Outros e modalidade Funcional; 17 testes passaram, desenhos conferidos em telas pequenas/grandes e banco aceita Funcional.
- [ ] Conferir filtro Outros e criação de Funcional no fluxo completo — conta autenticada disponível é encaminhada ao cadastro incompleto; não alterado para realizar testes.

- [x] Ajustar proporções do perfil e cards ativos, com títulos regionais e rolagem natural; quatro tamanhos de tela sem transbordamento.
- [x] Preservar recorrências ativas e limpar apenas históricas elegíveis acima de dez, sem apagar ocorrências ou estatísticas; testes transacionais desfeitos validaram doze ativas, renovação e preservação de jogos.
- [x] Limitar conversas de 24h antes a 24h após o jogo e automatizar limpeza segura de mensagens, vínculos e mídias; canceladas mantêm o prazo original. Rotina horária configurada, callback local autorizado testado.
- [x] Validar envio real e releitura em conversa de membros, bloqueio por link antigo e chamadas diretas, 45 testes e compilação sem erros.
- [ ] Validar callback da limpeza no aplicativo publicado — depende de publicar a versão atual; rotina agendada e callback local já testados.

- [x] Unificar o cadastro após Google com as sete etapas originais; seis testes passaram e sessão real percorreu estado/cidade, raio e foto obrigatória, sem alterar dados da conta. Salvamento final não executado para não preencher o perfil do usuário com dados de teste.

- [x] Selecionar e enviar até três fotos de capa juntas, melhorar resolução das fotos do perfil e suavizar os indicadores do carrossel.

- [x] Adicionar carrossel de até três fotos ao perfil, com edição e armazenamento permanente; 24 testes passaram e compilação sem erros.
- [ ] Conferir envio, swipe e persistência das capas entre contas — depende de sessão do usuário na prévia; tentativa de sessão própria não encontrou conta correspondente.

- [x] Remover credenciais administrativas expostas e conferir autorização no servidor e RLS sem alterar contas ou outras funcionalidades (administrador existente acessa; cinco funções negadas a usuário comum e sem sessão).
- [x] Confirmar conta atual sem papel admin e preservar as permissões existentes, conforme escolha do usuário; concessão futura exige operação privilegiada no banco.

- [x] Remodelar perfil pessoal e público conforme as duas referências, preservando ações e navegação.
- [x] Conferir os perfis com sessão real no celular e no computador (fotos carregadas, edição salva, perfil público e tema escuro sem erros; conta sem peladas para conferir listas preenchidas).

- [x] Adicionar modalidades em Outro e capas correspondentes, mantendo etapas (13 testes e geração real de basquete validados).
- [ ] Conferir criação autenticada com as novas modalidades — depende de login do usuário no preview.

- [x] Trocar chamadas de criação por “Criar jogo” e salvar a escolha regional após cadastro (Baba, Rachão, Pelada ou Outro).

- [x] Ajustar informações e tipografia da página de pelada conforme a imagem enviada, preservando ações existentes (compilação validada; conferência autenticada depende de login no preview).

- [x] Redesenhar o perfil público do jogador conforme a referência enviada.
- [x] Preservar seguir e adicionar ações funcionais de mensagem e convite para pelada.
- [x] Sincronizar a foto do perfil com a imagem de fundo e validar no celular (checagem visual requer login no preview).
- [x] Pelada como grupo: entrada automática/aprovação, sair, lista de espera, grupo exclusivo com RLS.
- [x] Alternância MAPA | LISTA, gerenciar pelada (editar, remover, transferir, encerrar).
- [x] Notificações de pelada com silenciar por grupo; denúncias e bloqueio.
- [ ] Tela de denúncias no painel adm (banco já pronto).
- [ ] Destaque de amigos nos cards do feed.
