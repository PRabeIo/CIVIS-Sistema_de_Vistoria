# CIVIS – Sistema de Vistorias Imobiliárias

Sistema web full-stack para gerenciamento completo de vistorias imobiliárias, com autenticação por perfil, controle de fluxo de vistoria e geração de relatórios técnicos.

Desenvolvido com foco em organização, rastreabilidade e automação do processo de vistoria entre administradores, clientes e vistoriadores.

## 📑 Sumário

- [Visão Geral](#-visão-geral)
- [Prints do Sistema](#-prints-do-sistema)
- [Diagramas do Sistema](#-diagramas-do-sistema)
- [Tipos de Usuário](#-tipos-de-usuário)
- [Fluxo completo da vistoria](#-fluxo-completo-da-vistoria)
- [Status da vistoria](#-status-da-vistoria-enum-banco)
- [Arquitetura do Sistema](#️-arquitetura-do-sistema)
- [Autenticação e Segurança](#-autenticação-e-segurança)
- [Estrutura do Projeto](#️-estrutura-do-projeto)
- [Banco de Dados](#️-banco-de-dados)
- [API REST](#-api-rest)
- [Variáveis de ambiente](#️-variáveis-de-ambiente)
- [Como rodar localmente](#-como-rodar-localmente)
- [Uploads e Relatórios](#-uploads-e-relatórios)
- [Regras de negócio](#️-regras-de-negócio-implementadas)
- [Roadmap](#️-roadmap-próximas-melhorias)
- [Stack Tecnológico](#-stack-tecnológico)
- [Status do Projeto](#-status-do-projeto)
- [Objetivo do Projeto](#-objetivo-do-projeto)
- [Considerações Finais](#-considerações-finais)

---

## 📌 Visão Geral

O processo de vistoria de imóveis, quando realizado de forma manual, costuma gerar atrasos, falhas de comunicação e retrabalho entre as partes envolvidas.

O CIVIS resolve esse problema por meio de uma plataforma digital que centraliza e automatiza todo o fluxo de vistorias, permitindo:

- Cadastro de imóveis e empreendimentos
- Agendamento de vistorias
- Execução guiada pelo vistoriador
- Validação pelo cliente
- Relatórios técnicos gerados com anexos
- Controle completo de status

O sistema segue arquitetura full-stack desacoplada com API REST, autenticação stateless via JWT e armazenamento de relatórios em nuvem (Supabase Storage).

---

## 🖼️ Prints do Sistema

### Tela de Login
![Login](prints/login.png)

### Gestão de Empreendimentos
![Empreendimentos](prints/gestao-empreendimentos.png)

### Tela do Vistoriador
![Vistoriador](prints/vistoriador.png)

### Agendar Vistoria
![Agendar](prints/agendar-vistoria.png)

### Detalhes da Vistoria
![Detalhes](prints/detalhes-vistoria.png)

---

## 📐 Diagramas do Sistema

Os diagramas abaixo foram utilizados durante a fase de planejamento e modelagem do sistema:

Eles ajudam a entender a arquitetura, os papéis dos usuários e o fluxo do sistema.


### Diagrama de Classes
![Diagrama de Classes](/diagramas/classe/diagrama-de-classes.png)

### Diagrama de Casos de Uso do Vistoriador
![Casos de Uso Vistoriador](diagramas/casos-de-uso/vistoriador.png)

### Diagrama de Casos de Uso do Cliente
![Casos de Uso Cliente](diagramas/casos-de-uso/cliente.png)

### Diagrama de Estado de um Imóvel
![Casos de Estado de um Imóvel](diagramas/estado/imovel.jpg)

---

## 👥 Tipos de Usuário

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
- Pode validar, rejeitar ou reagendar a vistoria realizada

---

## 🔁 Fluxo completo da vistoria

1. Administrador cria empreendimento
2. Administrador cria imóvel 
3. Sistema cria vistoria automaticamente  
4. Cliente agenda data da vistoria  
5. Vistoriador inicia vistoria  
6. Vistoriador gera relatório técnico  
7. Sistema aguarda validação do cliente  
8. Cliente valida ou rejeita  
9. Se validar → vistoriador finaliza  
10. Se rejeitar → cliente pode reagendar  

---

## 🧠 Status da vistoria (ENUM banco)

- Aguardando Agendamento da Vistoria
- Vistoria Agendada
- Em Andamento
- Aguardando Validação
- Vistoria Reagendada
- Vistoria Finalizada
- Vistoria Validada
- Vistoria Rejeitada

---

## 🏗️ Arquitetura do Sistema

Arquitetura backend organizada em camadas seguindo padrão de separação de responsabilidades:


routes → definição das rotas (/api/...) e aplicação de middlewares  
controllers → camada HTTP: valida req/res, chama services e retorna JSON  
services → regras de negócio + acesso ao banco (queries SQL)  
middlewares → autenticação (JWT) e autorização (roles)  
config → conexão com o banco
utils → helpers (JWT)

---

## 🔐 Autenticação e Segurança

O sistema utiliza autenticação baseada em JWT com controle de acesso por perfil de usuário.

### Autenticação
- Login gera token JWT assinado
- Token armazenado no localStorage
- Enviado em todas requisições protegidas:

```  
Authorization: Bearer SEU_TOKEN  
```

- Middleware valida token
- req.usuario é injetado com:
  id, tipo, cargo

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

## 🗂️ Estrutura do Projeto

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
 └── script.sql
```  

---

## 🗄️ Banco de Dados

PostgreSQL (Supabase)

Tabelas principais:
- funcionario
- administrador
- vistoriador
- cliente
- empreendimento
- imovel
- vistoria
- relatoriotecnico

Para criar o banco:
abrir Supabase → SQL Editor → executar script.sql

---

## 🌐 API REST

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

Todas as rotas (exceto login) exigem JWT:
Authorization: Bearer TOKEN

---

## ⚙️ Variáveis de ambiente

Crie o arquivo backend/.env com a seguinte estrutura:

```bash
DATABASE_URL=postgresql://USER:SENHA@HOST:5432/postgres
JWT_SECRET=sua_chave_jwt
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
PORT=3001
JWT_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=10
```
### Onde obter o DATABASE_URL

No painel do Supabase:

1. Abra seu projeto no Supabase
2. Clique em **Connect** (botão no topo da tela)
3. Selecione **Connection string**
4. Copie a URI PostgreSQL exibida

Cole no `.env` na variável:

DATABASE_URL=postgresql://USER:SENHA@HOST:5432/postgres

Observação: O USER:SENHA são definidos na criação do projeto Supabase.
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

---

## 🚀 Como rodar localmente

1. Clonar repositório
```bash
git clone LINK_DO_REPOSITORIO
cd CIVIS
``` 

2. Backend
```bash
cd backend
npm install
npm run dev
``` 

Backend disponível em:
http://localhost:3001

3. Frontend
```bash  
cd frontend
npm install
npm run dev
``` 

Frontend disponível em:
http://localhost:5173

---

## 📂 Uploads e Relatórios

### Relatórios (PDF)
Os relatórios técnicos são gerados pelo backend com PDFKit e salvos localmente em:

backend/relatorios/

Após a geração, o backend envia o PDF para o Supabase Storage (bucket público) e salva a URL em `vistoria.relatorio_url`.

Exemplo de URL pública retornada:
https://SEU-PROJETO.supabase.co/storage/v1/object/public/relatorios/arquivo.pdf

> Observação: a pasta `backend/relatorios/` é versionada vazia no GitHub (via `.gitkeep`), mas os arquivos gerados em runtime não são versionados.

---

## ✔️ Regras de negócio implementadas

- Vistoria só pode ser iniciada se estiver agendada
- Apenas o vistoriador que iniciou pode finalizar
- Cliente pode validar, rejeitar ou reagendar
- Reagendamento retorna vistoria ao fluxo
- Token expirado força logout automático
- Não é possível agendar datas no passado

---

## 🛣️ Roadmap (próximas melhorias)

- Página de perfil editável
- Soft delete de imóveis/empreendimentos
- Histórico de vistorias no ADM
- Logs administrativos
- Dashboard com métricas

---

## 🧱 Stack Tecnológico

### Frontend
- React (Vite)
- React Router DOM
- Framer Motion

### Backend
- Node.js
- Express
- PostgreSQL (Supabase)
- JWT (autenticação)
- Multer (upload de arquivos)
- PDFKit (geração de relatórios)

---

## 📊 Status do Projeto

Sistema funcional end-to-end  
Arquitetura refatorada e organizada  
Pronto para uso e expansão  

---

## 💼 Objetivo do Projeto

Este projeto foi desenvolvido como aplicação completa de portfólio full-stack, simulando um sistema real de gestão de vistorias imobiliárias.

Foco em:
- Arquitetura profissional
- Separação em camadas
- Segurança e autenticação
- Fluxo real de negócio
- Organização de código escalável

Arquitetura preparada para deploy em produção (Render, Railway ou VPS) e expansão para uso real.

---

## 📌 Considerações finais

O CIVIS foi estruturado como uma aplicação full-stack completa, com foco em arquitetura organizada, separação de responsabilidades e implementação de um fluxo real de negócio.

O projeto permanece em evolução, com melhorias planejadas e expansão contínua das funcionalidades.
