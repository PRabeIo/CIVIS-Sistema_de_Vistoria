# CIVIS – Sistema de Vistorias Imobiliárias

Sistema web full-stack para gerenciamento completo de vistorias imobiliárias, com autenticação por perfil, controle de fluxo de vistoria e geração de relatórios técnicos por IA.

Desenvolvido com foco em organização, rastreabilidade e automação do processo de vistoria entre administradores, clientes e vistoriadores.

> O projeto está em reformulação para virar produto. O andamento está em [Planning.md](Planning.md).

## Sumário

- [Visão Geral](#visão-geral)
- [Prints do Sistema](#prints-do-sistema)
- [Tipos de Usuário](#tipos-de-usuário)
- [Fluxo completo da vistoria](#fluxo-completo-da-vistoria)
- [Status da vistoria](#status-da-vistoria-enum-banco)
- [Arquitetura do Sistema](#arquitetura-do-sistema)
- [Autenticação e Segurança](#autenticação-e-segurança)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Banco de Dados](#banco-de-dados)
- [API REST](#api-rest)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Como rodar localmente](#como-rodar-localmente)
- [Uploads e Relatórios](#uploads-e-relatórios)
- [Regras de negócio](#regras-de-negócio-implementadas)
- [Roadmap](#roadmap-próximas-melhorias)
- [Stack Tecnológico](#stack-tecnológico)
- [Status do Projeto](#status-do-projeto)
- [Objetivo do Projeto](#objetivo-do-projeto)
- [Considerações Finais](#considerações-finais)

---

## Visão Geral

O processo de vistoria de imóveis, quando realizado de forma manual, costuma gerar atrasos, falhas de comunicação e retrabalho entre as partes envolvidas.

O CIVIS resolve esse problema por meio de uma plataforma digital que centraliza e automatiza todo o fluxo de vistorias, permitindo:

- Cadastro de imóveis e empreendimentos
- Agendamento de vistorias
- Execução guiada pelo vistoriador
- Validação pelo cliente
- Relatórios técnicos gerados com IA
- Controle completo de status

O sistema segue arquitetura full-stack desacoplada com API REST, autenticação stateless via JWT e armazenamento de relatórios em nuvem (Supabase Storage).

---

## Prints do Sistema

### Tela de Login
![Login](prints/login.png)

### Tela Inicial do Vistoriador
![Vistoriador](prints/perfil-usuario.png)

### Tela de Perfil do Cliente
![Perfil](prints/vistoriador.png)

### Tela de Gestão de Empreendimentos
![Empreendimentos](prints/gestao-empreendimentos.png)

### Tela de Agendamento de Vistoria
![Agendar](prints/agendar-vistoria.png)

### Tela de Detalhes da Vistoria
![Detalhes](prints/detalhes-vistoria.png)

### Tela de Criação dos Relatórios
![Relatório](prints/criar-relatorio.png)

### Tela de Validação da Vistoria
![Validação](prints/validar-vistoria.png)

---

## Tipos de Usuário

ADMINISTRADOR
- Cria funcionários (administrador e vistoriador)
- Cria empreendimentos com imagem
- Cria imóveis vinculando cliente
- Ao criar imóvel → vistoria é criada automaticamente
- Gerencia o sistema

VISTORIADOR
- Visualiza vistorias disponíveis
- Assume vistoria agendada
- Inicia vistoria
- Preenche dados e gera o relatório técnico
- Finaliza após validação do cliente

CLIENTE
- Visualiza seus imóveis e vistorias
- Agenda vistoria
- Visualiza relatório
- Pode validar ou rejeitar a vistoria realizada

---

## Fluxo completo da vistoria

1. Administrador cria empreendimento
2. Administrador cria imóvel 
3. Sistema cria vistoria automaticamente  
4. Cliente agenda a data da vistoria  
5. Vistoriador inicia vistoria  
6. Vistoriador gera relatório técnico  
7. Sistema aguarda validação do cliente  
8. Cliente valida ou rejeita  
9. Se validar → vistoriador finaliza  
10. Se rejeitar → vistoria é encerrada como rejeitada

---

## Status da vistoria (coluna `status`, VARCHAR + CHECK)

- **Aguardando Agendamento da Vistoria**: aguardando agendamento do cliente
- **Vistoria Agendada** : vistoria marcada pelo cliente.
- **Vistoria Reagendada**: (fluxo de reagendamento temporariamente desativado).
- **Em Andamento**: vistoriador iniciou e está coletando dados.
- **Aguardando Validação**: relatório técnico gerado e enviado ao cliente.
- **Vistoria Validada**: cliente aprovou; vistoriador pode finalizar.
- **Vistoria Finalizada**: vistoria concluída pelo vistoriador.
- **Vistoria Rejeitada**: atualmente também encerra o ciclo da vistoria.

---

## Arquitetura do Sistema

O backend segue arquitetura em camadas (Layered Architecture), com separação clara entre camada HTTP, regras de negócio e persistência.

routes → definição das rotas (/api/...) e aplicação de middlewares  
controllers → camada HTTP: valida req/res, chama services e retorna JSON  
services → regras de negócio + acesso ao banco (queries SQL)  
middlewares → autenticação (JWT) e autorização (roles)  
config → conexão com o banco
utils → helpers (JWT)

### Arquitetura Frontend

O frontend foi completamente refatorado para garantir:

- Layout 100% responsivo (desktop e mobile)
- CSS escopado por página (evitando vazamento de estilos)
- Componentes desacoplados
- Navbar centralizada e configurável via `navConfig.js`
- Estilos compartilhados organizados em `src/pages/styles`

Cada página possui seu próprio arquivo CSS ou utiliza estilos globais padronizados quando necessário (ex: páginas de Perfil, Cadastro e EditarPerfil).

---

## Autenticação e Segurança

O sistema utiliza autenticação baseada em JWT com controle de acesso por perfil de usuário.

### Autenticação
- Uma tabela `usuario` para todos os perfis; e-mail único.
- O login abre uma **sessão revogável** (tabela `sessao`) e grava dois cookies `httpOnly` + `SameSite=Strict`:
  - `civis_at`: access token (JWT de 15 min com o id da sessão), enviado para `/api`;
  - `civis_rt`: refresh token opaco (7 dias, guardado no banco só como hash), enviado só para `/api/auth`.
- Nenhum token fica no `localStorage`; o frontend chama a API com `credentials: "include"` e, em 401, renova a sessão uma vez (`POST /api/auth/refresh`, com rotação do refresh).
- O middleware confere a sessão no banco a cada requisição: logout, troca de senha, mudança de papel, desativação ou exclusão cortam o acesso na hora.
- Rotas: `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`.
- Clientes de API (scripts, testes) podem enviar o access token em `Authorization: Bearer`.

### Controle de acesso (RBAC)
- Rotas protegidas por middleware de autenticação
- Verificação de perfil por cargo:
  - Administrador
  - Vistoriador
  - Cliente

### Segurança aplicada
- Senhas criptografadas com bcrypt
- JWT com expiração configurada
- Variáveis sensíveis protegidas via .env
- Validação de dados no backend
- Uploads controlados pelo servidor
- Rotas críticas protegidas por autenticação e autorização
- Tratamento de sessão expirada no frontend (auto logout)

Se token expirar:
- frontend remove token
- redireciona para login

---

## Estrutura do Projeto

```bash  
CIVIS/
 ├── backend/
 │   ├── src/
 │   │   ├── controllers/
 │   │   ├── routes/
 │   │   ├── services/
 │   │   ├── middlewares/
 │   │   ├── utils/
 │   │   └── config/
 │   ├── uploads/
 │   │   ├── clientes/
 │   │   ├── empreendimentos/
 │   │   └── funcionarios/
 │   ├── relatorios/
 │   └── server.js
 │
 ├── frontend/
 │   ├── src/
 │   │   ├── pages/
 │   │   ├── services/
 │   │   └── utils/
 │   └── public/
 │
 ├── diagramas/
 └── docker-compose.yml
```  

---

## Banco de Dados

PostgreSQL (Supabase)

Tabelas principais:
- usuario: identidade única de todos (e-mail único, senha, papel `admin` | `vistoriador` | `cliente`, ativo)
- cliente: perfil 1:1 do usuário cliente (`idcliente` = `usuario.id`)
- funcionario: perfil 1:1 de admin e vistoriador (`id` = `usuario.id`)
- empreendimento
- imovel
- vistoria
- relatoriotecnico

O schema é criado **só por migrations** (`backend/migrations/*.sql`), aplicadas em ordem pelo
`backend/scripts/migrate.js`, que registra cada uma em `schema_migrations`.

```bash
docker compose up -d db          # Postgres local na porta 55432
cd backend
npm run migrate                  # aplica as migrations pendentes
npm run seed                     # dados de teste (admin, vistoriador, cliente…)
npm run db:reset                 # recria o schema do zero + seed (só dev)
npm run seed:admin               # cria o primeiro admin a partir de ADMIN_* (produção)
```

Usuários do seed: `admin@civis.test`, `vistoriador@civis.test` e `cliente@civis.test`. A senha é
`SEED_PASSWORD` ou o padrão definido em `backend/scripts/seed.ts`.

Para usar o Supabase, aponte `DATABASE_URL` para o projeto, defina `DATABASE_SSL=require` e rode
`npm run migrate`.

---

## API REST

A API segue padrão REST sob o prefixo:

/api/

Principais grupos de rotas:

- /auth → autenticação e login
- /clientes → gestão de clientes
- /funcionarios → gestão de funcionários (admin)
- /empreendimentos → gestão de empreendimentos
- /imoveis → imóveis vinculados a clientes
- /vistorias → fluxo completo da vistoria
- /relatorio → geração e acesso a relatórios

Todas as rotas (exceto login e cadastro) exigem JWT:
Authorization: Bearer TOKEN

---

## Variáveis de ambiente

Renomeie o arquivo `backend/example.env` para `backend/.env`, ele deve ter a seguinte estrutura:

```env
PORT=3001
DATABASE_URL=postgres://civis:civis@127.0.0.1:55432/civis
DATABASE_SSL=disable            # "require" para Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
# Storage dos relatórios (S2): "local" (dev, pasta backend/storage/) ou "supabase" (produção).
# Com supabase, o bucket PRECISA ser privado (o acesso é por URL assinada de 10 min).
STORAGE_DRIVER=local
SUPABASE_BUCKET_RELATORIOS=relatorios
JWT_SECRET=                     # mínimo 32 caracteres (veja "Gerar JWT_SECRET")
# Sessão (S5): access 15 min + refresh 7 dias, em cookies httpOnly
SESSAO_ACCESS_MIN=15
SESSAO_REFRESH_DIAS=7
# Origens do frontend liberadas no CORS (lista separada por vírgula)
CORS_ORIGIN=http://localhost:5173
# Limites de tentativas (S4)
RATE_LIMIT_LOGIN_MAX=5
RATE_LIMIT_CADASTRO_MAX=10
# strict (padrão) | lax | none. Front e API precisam estar no mesmo site (ex.: app.x.com e api.x.com)
COOKIE_SAMESITE=strict
# true em produção (HTTPS). Padrão: true quando NODE_ENV=production
# COOKIE_SECURE=true
# true atrás de proxy/load balancer (Render, Railway...) para o IP real ir para a sessão
# TRUST_PROXY=true
BCRYPT_SALT_ROUNDS=10
GEMINI_API_KEY=SUA_CHAVE_AQUI
# SEED_PASSWORD=                # senha dos usuários do seed
# Primeiro admin (npm run seed:admin): ADMIN_NOME, ADMIN_EMAIL, ADMIN_CPF, ADMIN_SENHA, ADMIN_TELEFONE
```

Ao iniciar, o backend **confere as variáveis** e não sobe se alguma obrigatória faltar ou estiver errada (`DATABASE_URL`, `JWT_SECRET` com 32+ caracteres, `SUPABASE_*` quando `STORAGE_DRIVER=supabase`, `CORS_ORIGIN` em produção, números e opções válidos). A mensagem lista cada variável com o problema. Sem `GEMINI_API_KEY` ele só avisa e gera os relatórios no modo simplificado.

No frontend, copie `frontend/.env.example` para `frontend/.env.local`:

```env
VITE_SERVER_URL=http://localhost:3001   # origem do backend (arquivos em /uploads)
VITE_API_URL=http://localhost:3001/api  # opcional; padrão: ${VITE_SERVER_URL}/api
```
### Onde obter o DATABASE_URL

No painel do Supabase:

1. Abra seu projeto no Supabase
2. Clique em **Connect** (botão no topo da tela)
3. Selecione **Connection string**
4. Copie a URI PostgreSQL exibida

Cole no `.env` na variável:
```bash
DATABASE_URL=postgresql://USER:SENHA@HOST:5432/postgres
```

> Observação: O USER:SENHA são definidos na criação do projeto Supabase.
Caso não lembre, é possível redefinir a senha em: Database → Settings → Reset database password.


### Onde obter a SUPABASE_SERVICE_ROLE_KEY

No painel do Supabase:

Settings → API → Service Role Key

⚠️ Nunca publique essa chave no GitHub.
Ela possui acesso administrativo ao projeto.

### Gerar JWT_SECRET

Você pode gerar uma chave segura com:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Primeiro administrador (produção)

O `npm run seed` é só para dev/teste. Num banco novo de produção, crie o primeiro admin assim:

1. Defina no ambiente `ADMIN_NOME`, `ADMIN_EMAIL`, `ADMIN_CPF` e `ADMIN_SENHA` (mesmas regras do cadastro: CPF válido, senha com 8+ caracteres, letras e números).
2. Rode `npm run seed:admin` (ou `npm run seed:admin:prod` depois do `npm run build`).
3. Apague `ADMIN_SENHA` do ambiente e troque a senha pelo sistema.

O script só cria o admin se ainda não existir nenhum; rodar de novo não altera nada.
No sistema, um admin não pode excluir nem rebaixar a própria conta, e o último administrador ativo nunca pode ser removido.

### Configuração da API do Gemini (IA)

A geração de relatórios utiliza a **API do Google Gemini**. Para habilitá-la você deve criar uma API Key:

1. Acesse o Google AI Studio.
2. Faça login com sua conta Google.
3. Vá em **Get API key** (ou "API keys") e clique em **Create API key**.
4. Copie a chave gerada.

Abra o `.env` e adicione a variável:

```env
GEMINI_API_KEY=SUA_CHAVE_AQUI
```

---

## Como rodar localmente

1. Clonar repositório
```bash
git clone LINK_DO_REPOSITORIO
cd CIVIS
``` 

2. Banco de dados (Docker)
```bash
docker compose up -d db
```

3. Backend
```bash
cd backend
npm install
cp example.env .env
npm run db:reset
npm run dev
``` 

Backend disponível em:
`http://localhost:3001`

4. Frontend
```bash  
cd frontend
npm install
npm run dev
``` 

Frontend disponível em:
`http://localhost:5173`

### Testes e lint

```bash
docker compose up -d db-test     # banco de teste (porta 55433, em memória)
cd backend && npm test && npm run lint && npm run typecheck
cd frontend && npm test && npm run lint && npm run typecheck
```

### TypeScript

O projeto está migrando para TypeScript de forma incremental: `.js` e `.ts` convivem, e só os arquivos
TypeScript são checados (`npm run typecheck`). Arquivos novos ou reescritos devem ser `.ts`/`.tsx`.

No backend, `npm run dev` usa `tsx watch`; para produção, `npm run build` gera `dist/` e
`npm start` roda `node dist/server.js`.

O `npm test` do backend recria o schema do banco de teste a partir das migrations e aplica o seed
antes da suíte.

No frontend, `npm run check:imports` (também rodado pelo `npm run build`) confere se todo import
relativo existe com a mesma caixa de letras: no Windows `Home.css` acha `home.css`, no Linux não.
Os endereços das telas ficam em `src/rotas.js`, e um teste garante que nenhum link aponta para
uma rota inexistente ou de outro perfil.

---

## Uploads e Relatórios

### Relatórios Técnicos (IA + PDF)

A geração do relatório ocorre em etapas:

1. O backend envia os dados da vistoria para a API do Google Gemini.
2. A IA gera um texto técnico humanizado com base nas informações fornecidas.
3. O backend monta o PDF em memória com PDFKit (nada é gravado em pasta pública).
4. O PDF vai para um **storage privado** com nome UUID, e a chave fica em `vistoria.relatorio_arquivo`:
   - `STORAGE_DRIVER=local` (dev/teste): pasta `backend/storage/`, fora do Git e não servida estaticamente;
   - `STORAGE_DRIVER=supabase` (produção): bucket **privado** `SUPABASE_BUCKET_RELATORIOS`.
5. Quem pode ver a vistoria abre o relatório por `GET /api/vistorias/:id/relatorio`: em dev a API envia o PDF; com Supabase, redireciona para uma URL assinada que expira em 10 minutos.

Caso a variável `GEMINI_API_KEY` não esteja configurada, o sistema gera um relatório simplificado com base nos dados estruturados.

> Em produção, crie o bucket no Supabase com **Public bucket desligado**. A API nunca devolve uma URL pública.

---

## Regras de negócio implementadas

- Vistoria só pode ser iniciada se estiver agendada
- Apenas o vistoriador que iniciou pode finalizar
- Cliente pode validar ou rejeitar vistorias
- Vistoria rejeitada encerra o ciclo atual
- Token expirado força logout automático
- Não é possível agendar datas no passado

---

## Roadmap (próximas melhorias)

- Soft delete de Imóveis/Empreendimentos
- Edição de Imóveis/Empreendimentos
- Reativar fluxo de Reagendamento: caso o cliente rejeite, permite novo agendamento da vistoria
- Histórico de vistorias para o Vistoriador
- Logs administrativos para o Administrador
- Dashboard com métricas

---

## Stack Tecnológico

### Frontend
- React (Vite)
- React Router DOM
- Framer Motion

### Backend
- Node.js
- Express
- PostgreSQL (Supabase)
- Google Gemini API (geração de relatórios técnicos humanizados)
- PDFKit

---

## Status do Projeto

- Sistema funcional end-to-end  
- Geração de relatórios com IA (Google Gemini)  
- Frontend totalmente responsivo (desktop e mobile)  
- Arquitetura desacoplada e padronizada  
- Pronto para uso e expansão 

---

## Objetivo do Projeto

Este projeto foi desenvolvido como aplicação completa de portfólio full-stack, simulando um sistema real de gestão de vistorias imobiliárias.

Foco em:
- Arquitetura profissional
- Separação em camadas
- Segurança e autenticação
- Fluxo real de negócio
- Organização de código escalável

Arquitetura preparada para deploy em produção (Render, Railway ou VPS) e expansão para uso real.

---

## Considerações finais

O CIVIS foi estruturado como uma aplicação full-stack completa, com foco em arquitetura organizada, separação de responsabilidades e implementação de um fluxo real de negócio.

O projeto permanece em evolução, com melhorias planejadas e expansão contínua das funcionalidades.
