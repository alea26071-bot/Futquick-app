# Futquick 

PROMPT PARA DESENVOLVIMENTO DO APLICATIVO



Objetivo



Desenvolva um aplicativo mobile moderno (Android e iOS) cujo objetivo é conectar pessoas que desejam jogar futebol. O aplicativo deve funcionar como um marketplace de peladas, onde organizadores criam partidas e jogadores encontram vagas disponíveis para participar.



O aplicativo deve transmitir sensação de tecnologia, praticidade, comunidade e confiança.



A interface deve seguir um padrão semelhante aos aplicativos modernos como Uber, Tinder, Airbnb e WhatsApp, com design limpo, intuitivo e profissional.



---



Identidade



Nome: Futquick



Slogan:

"Encontre sua próxima pelada."



---



Público-alvo



- Jogadores de futebol amador

- Organizadores de peladas

- Quadras de futebol

- Pessoas entre 15 e 50 anos



---



Problema que resolve



Hoje as peladas são organizadas em grupos de WhatsApp.



Frequentemente:



- falta jogador;

- alguém desiste em cima da hora;

- pessoas querem jogar mas não conhecem grupos.



O aplicativo conecta essas duas necessidades.



---



Fluxo principal



Organizador abre o aplicativo.



↓



Cria uma pelada.



↓



Define:



- local

- horário

- data

- quantidade de jogadores que faltam para a pelada

- nível da partida

- tipo de campo

- gratuita ou paga



↓



A pelada fica pública.



↓



Usuários recebem notificações.



↓



Interessados solicitam participação.



↓



Organizador tem acesso a quem solicitou a pelada com a opção de ver perfil, aprovar ou recusar.



↓



As vagas atualizam automaticamente para todos.



---



Funcionalidades



Cadastro



Login com:



- Google

- Apple

- Telefone 



Assim que abrir o app haverá um cadastro por etapas contendo:



- Nome

- Idade

- Cidade

- Foto de perfil

- Bio

- Posição favorita (mas não ficará visível no perfil)



---



Perfil



Mostrar:



Foto



Nome



Quantidade de peladas



Nota média



Índice de confiabilidade que deve ser descrito apenas com o nome: Postura



Histórico



Conquistas



---



Formar Pelada



Campos:



Nome da pelada



Data



Hora



Endereço, Mapa: 



O usuário toca em Selecionar Local.

Abre um mapa em tela cheia.

Ele pode:

pesquisar o nome do campo (ex.: "Arena Paris Saint-Germain");

tocar em qualquer ponto do mapa;

usar a localização atual.

Ao tocar no local, aparece um card na parte inferior com:

📍 Nome do local (se existir)

🏠 Endereço completo

Cidade e CEP (quando disponível)

Botão Confirmar Local

Ao confirmar, o aplicativo preenche automaticamente o campo Local da Pelada.

Exemplo:

📍 Arena Paris Saint-Germain



Rua Exemplo, 123

Lagoa Nova

Natal - RN



[ Confirmar Local ]

Depois da confirmação:

Local da Pelada

Arena Paris Saint-Germain Rua Exemplo, 123 - Natal/RN

✅ O usuário não precisa digitar nada.

E se o campo não existir no Google Maps?

Sem problema.

O usuário pode tocar no mapa em qualquer ponto.

O aplicativo pega as coordenadas e faz a conversão para um endereço aproximado (processo chamado de geocodificação reversa).

O que acontece quando outro usuário abre essa pelada?

Ele verá:

O endereço.

Um mini mapa.

Botão Como chegar.

Ao clicar, pode abrir diretamente o Google Maps ou outro aplicativo de navegação para traçar a rota até o local.



Quantidade de jogadores que faltam e quantos já tem 



Valor (opcional)



Tipo:



- Society

- Campo

- Futsal



Nível:



- Iniciante

- Intermediário

- Avançado



Foto da pelada: (opcional) sugerir uma foto do campo ou da equipe, ficará visível para os usuários analisarem e aparecerá no menu juntamente com as informações da pelada como um fundo com gradiente e degrade, caso o usuário n queira colocar uma foto, o próprio app criará uma imagem genérica relacionada ao futebol





Após criar a pelada e aparecer no menu para os usuários, os usuários vão ter a opção de curtir a pelada, como uma rede social, Compartilhar a pelada via link para o WhatsApp ou outras redes sociais para chamar amigos 



Descrição



Permitir aprovação manual ou automática.



---



Buscar Peladas



Tela principal mostrando:



Peladas próximas



Mapa



Lista



Filtros:



Distância



Horário



Data



Gratuita



Paga



Tipo de campo



Nível





---



Sistema de Solicitação



Usuário clica:



"Quero participar"



↓



Organizador recebe notificação e consegue vizualizar o perfil do jogador que solicitou.



↓



Pode:



Aceitar



Recusar



↓



Se aceitar:



Jogador entra automaticamente.



Número de vagas diminui em tempo real.



---



Notificações



 Na primeira vez que o usuário abrir o app, pediria permissão:



"Deseja receber notificações de novas peladas perto de você?"



Se aceitar, ele pode escolher:



Até 3 km



Até 5 km



Até 10 km



Toda a cidade



O pup de notificações deve ter uma duração de 5 segundos na tela superior e ter uma animação de saída e entrada 



O celular da pessoa recebe a notificação mesmo que: o aplicativo esteja fechado; o aplicativo esteja em segundo plano; a tela do celular esteja bloqueada.



A notificação apareceria assim, exemplo:



Futquick ⚽️



Falta 1 jogador para uma pelada a 3 km de você.



Hoje às 19:30



↑ Arena Paris Saint-Germain



Ao tocar nela, o aplicativo abre diretamente na página dessa pelada.



Todas as notificações do Futquick devem ser Push Notifications nativas do Android e iOS, aparecendo na barra de notificações do dispositivo mesmo quando o aplicativo estiver fechado ou em segundo plano. Ao tocar na notificação, o usuário deve ser direcionado diretamente para a tela correspondente (pelada, chat ou solicitação).



Receber quando:



Nova pelada perto.



Foi aceito.



Foi recusado.



Pelada cancelada.



Falta 1 hora.



Falta 30 minutos.



Organizador alterou informações.



Recebeu alguma mensagem pelo chat



---



Avaliação



Após a partida encerrada o app ira avisar para o criador da pelada avaliar os jogadores, isso de forma obrigatória e simples.



O adm, que criou a pelada, vai avaliar os jogadores que solicitaram a participação.



Critérios:



⭐⭐⭐⭐⭐



---



Índice de Postura



Criar automaticamente baseado em:



Peladas concluídas



Ausências



Avaliações



Mostrar em porcentagem.



Exemplo:



98% confiável.



---



Sistema Antifake



Telefone verificado



---



Histórico



Mostrar todas as peladas.



Fotos.



Participantes.



Avaliações.



---



Mapa



Barra de pesquisa, para todos os locais possíveis do Brasil, de todas as regiões 

Mapa de todo o Brasil



Mostrar todas as peladas próximas.



Ícones personalizados.



Ao clicar:



Abrir detalhes. E pedir confirmação para a marcação do local da pelada 

Endereço vai automaticamente para o espaço do local de pelada 

Locais de todo o Brasil 

---



Chat 



Confirmação de leitura: dois traços azuis quando vista, 2 traços cinzas para mensagens enviadas e n vistas, 1 traço cinza para mensagens n enviadas por conta da rede de internet



Notificação ao receber uma mensagem 



Chat entre:



Organizador



Participantes



Enviar:



Texto



Localização



Avisos



Foto

---



Favoritos



Salvar:



Quadras



Organizadores



Jogadores



---



Compartilhar



Compartilhar pelada via:



WhatsApp



Instagram



Link



QR Code



---



Parceiros



Área exclusiva para quadras.



Cadastrar:



Endereço



Fotos



Horários



Reservas futuras



---



Administraç



---



Tecnologias



Firebase



Autenticação



Banco de dados em tempo real



Push Notifications



Google Maps



Geolocalização



Cloud Storage



Arquitetura escalável.



---



Interface



Visual extremamente moderno.



Muito semelhante aos melhores aplicativos atuais.



Opção para o tema escuro e claro.



Animações suaves.



Ícones minimalistas.



Botões grandes.



Alta acessibilidade.





Objetivo Final



Criar uma plataforma escalável que se torne a principal referência para organização de peladas no Brasil, oferecendo uma experiência simples, rápida, segura e intuitiva para jogadores, organizadores e quadras, com potencial de reservas esportivas e toda a comunidade do futebol amador.



O Futquick deve ser o aplicativo mais rápido do Brasil para encontrar ou completar uma pelada. O usuário não quer navegar por dezenas de telas. O objetivo é que qualquer pessoa consiga baixar o aplicativo, criar sua conta e encontrar uma pelada em poucos minutos. Toda funcionalidade que aumente o número de cliques sem gerar valor direto deve ser evitada. O foco é simplicidade extrema, velocidade e praticidade.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://futquick-app.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/51a04721-fe87-4997-8b87-066f643e38b4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
