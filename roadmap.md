# Roadmap

- [ ] Ajustar proporções do perfil e cards ativos, com títulos regionais e rolagem natural.
- [ ] Preservar recorrências ativas e limpar apenas históricas elegíveis acima de dez, sem apagar ocorrências ou estatísticas.
- [ ] Limitar conversas de 24h antes a 24h após o jogo e automatizar limpeza segura de mensagens, vínculos e mídias.
- [ ] Validar regras, acesso direto, telas em tamanhos distintos e agendamento.

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
