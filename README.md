# CIVIS – Sistema de Gestão de Vistorias

## Sumário 

- [📌 Visão Geral](#-visão-geral)
- [🗂️ Mapa do Repositório](#️-mapa-do-repositório)
- [🚀 Como rodar o projeto localmente](#-como-rodar-o-projeto-localmente)
- [🧱 Stack Tecnológico](#-stack-tecnológico)
- [🧪 Status da Build](#-status-da-build)

## 📌 Visão Geral

O processo de vistoria de imóveis, quando feito manualmente, pode gerar atrasos, confusões e retrabalho entre construtoras, clientes e vistoriadores.  
O **CIVIS** resolve esse problema com uma plataforma digital web que centraliza e automatiza o processo de vistoria.  
O sistema permite o agendamento, execução, acompanhamento e validação de vistorias de forma prática, rápida e transparente.  
Utiliza tecnologias modernas como **React.js**, **Node.js (Express)** e banco de dados **PostgreSQL via Supabase**, com autenticação baseada em permissões.  
O sistema é acessado diretamente por navegadores, sem necessidade de instalação local.

---

## 🗂️ Mapa do Repositório


```

Sistema-de-Vistoria/ 

│ 

├── backend/                     → Backend da aplicação (Node.js + Express) 

│   ├── assets/                  → Recursos auxiliares (imagens, documentos, etc.) 

│   ├── controllers/             → Lógica de controle das rotas 

│   ├── models/                  → Modelos das entidades do banco de dados 

│   ├── relatorios/              → Geração e manipulação de relatórios 

│   ├── routes/                  → Definição das rotas da API 

│   ├── uploads/                 → Pasta para arquivos enviados 

│   ├── .env                     → Variáveis de ambiente 

│   ├── app.js                   → Configuração principal do Express 

│   ├── db.js                    → Conexão com o banco de dados 

│   ├── enviarEmail.js           → Lógica para envio de e-mails 

│   └── server.js                → Ponto de entrada do backend 

│ 

├── node_modules/           → Dependências do Node.js (gerado automaticamente) 

│ 

├── public/                 → Arquivos estáticos do frontend 

│ 

├── src/                             → Código-fonte do frontend (React.js) 

│   ├── pages/                       → Páginas divididas por tipo de usuário 

│   │   ├── Cadastro/                → Tela de cadastro 

│   │   ├── HomeAdm/                 → Página inicial do administrador 
  
│   │   ├── HomeCliente/             → Página inicial do cliente 

│   │   ├── HomeVistoriador/         → Página inicial do vistoriador 

│   │       ├── CriarRelatorio/      → Etapa de criação de relatório 

│   │       ├── IniciarVistoria/     → Etapa de início da vistoria 

│   │       ├── ReagendarVistoria/   → Etapa para reagendamento 

│   │       ├── RealizarVistoria/    → Etapa para realizar vistoria 

│   │       └── VistoriaData/        → Dados relacionados às vistorias 

│   │   ├── Inicial/                 → Página inicial antes do login 

│   │   ├── Login/                   → Página de login 

│   │   └── supabaseClient.js        → Conexão com Supabase 

│   ├── utils/                       → Funções utilitárias 

│   ├── App.jsx                      → Componente principal da aplicação React 

│   ├── index.jsx                    → Ponto de entrada do React 

│   ├── main.jsx                     → Arquivo de renderização 

├── .gitignore                       → Arquivos/pastas ignorados pelo Git 

├── eslint.config.js                 → Configurações do ESLint 

├── index.html                       → HTML base da aplicação React 

├── package.json                     → Configurações e dependências do projeto 

├── package-lock.json                → Versões exatas das dependências 

├── README.md                        → Arquivo de instruções e documentação 

├── script.sql                       → Script para criação do banco de dados 

└── vite.config.sql                  → Arquivo configuração do Vite

```

## 🚀 Como rodar o projeto localmente

Requisitos:
- Node.js 18+
- Conta no [Supabase](https://supabase.com/) com base de dados PostgreSQL configurada
- Ferramentas como Git e terminal

### 1. Clone o repositório

```bash
git clone https://github.com/PRabeIo/CIVIS-Sistema_de_Vistoria
```

### 2. Instale as dependências do frontend/backend

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env` com as credenciais do seu projeto no Supabase:

```env
DATABASE_URL=postgresql://postgres:xxxxxxxxx@db.xxxxxxxxxxxxxx.supabase.co:5432/postgres
PORT=3001
SUPABASE_SERVICE_ROLE_KEY=sua-public-anon-key

OBS: O servidor usa a porta definida como 3001 para desenvolvimento local
```

### 4. Inicie a aplicação
Inicie o frontend: 

No terminal, execute: 
```bash
npm run dev
```
O sistema estará acessível por padrão em `http://localhost:5432`

Inicie o backend: 

Em outro terminal, navegue até a pasta do backend:  
```bash
cd backend  

Em seguida, execute: 

node server.js 


```

## 🧱 Stack Tecnológico

| Camada         | Tecnologia                |
| -------------- | ------------------------- |
| Frontend       | React.js + Vite           |
| Backend        | Node.js + Express.js      |
| Banco de Dados | PostgreSQL via Supabase   |
| Autenticação   | Supabase Auth + JWT       |
| Armazenamento  | Upload local (`/uploads`) |

---

## 🧪 Status da Build

> O sistema está funcional, mas ainda há futuras atualizações que eu pretendo fazer.
> Anteriormente o sistema enviava email diretamente pros emails cadastrados no .env, mas acabei removendo a função pois o SMTP do google parou de funcionar.
> Solução futura pra isso será colocar outro sistema, e enviar diretamente para os emails do cliente e vistoriador, e não um email fixo (como eu havia feito anteriormente para teste).
> Também foram feito diagramas de casos de uso, diagramas de classe, diagramas de atividade, apenas preferi não subir junto.

---

