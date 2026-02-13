# CIVIS – Sistema de Gestão de Vistorias

Sistema web para gestão completa de vistorias de imóveis, desenvolvido com foco em organização, rastreabilidade e transparência entre construtoras, clientes e vistoriadores.

A aplicação foi pensada inicialmente para uso em ambiente mobile, sendo acessada diretamente pelo navegador, sem necessidade de instalação.

## Sumário 

- [📌 Visão Geral](#-visão-geral)
- [📐 Diagramas do Sistema](#-diagramas-do-sistema)
- [🗂️ Mapa do Repositório](#️-mapa-do-repositório)
- [🚀 Como rodar o projeto localmente](#-como-rodar-o-projeto-localmente)
- [🧱 Stack Tecnológico](#-stack-tecnológico)
- [🧪 Status da Build](#-status-da-build)

## 📌 Visão Geral

O processo de vistoria de imóveis, quando realizado de forma manual, costuma gerar atrasos, falhas de comunicação e retrabalho entre as partes envolvidas.

O CIVIS resolve esse problema por meio de uma plataforma digital que centraliza e automatiza todo o fluxo de vistorias, permitindo:

- Agendamento de vistorias
- Execução guiada do processo de vistoria
- Acompanhamento do status por perfil de usuário
- Registro estruturado das informações coletadas
- Validação das vistorias realizadas

O sistema utiliza **React.js** no frontend, **Node.js (Express)** no backend e **PostgreSQL via Supabase**, contando com autenticação e controle de acesso por perfil.

---

### Demonstração do Login e Cadastro
<div align="center">
  <video src="https://github.com/user-attachments/assets/fba8fe24-4518-475e-9ff3-b155f94e9f49" width="100%" autoplay loop muted playsinline></video>
</div>

### Demonstração da Realização da Vistoria
<div align="center">
  <video src="https://github.com/user-attachments/assets/9b95549a-d5cf-4849-a208-ea7d552f44eb" width="100%" autoplay loop muted playsinline></video>
</div>

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

## 👥 Perfis de Usuário

- Administrador
  - Gerenciamento geral do sistema
  - Acompanhamento das vistorias
  - Controle de usuários

- Vistoriador
  - Execução das vistorias
  - Criação e preenchimento de relatórios
  - Reagendamento de vistorias

- Cliente
  - Acompanhamento do status da vistoria
  - Visualização das informações registradas
  - Validação das vistorias realizadas
---

## 🗂️ Mapa do Repositório


```
Sistema-de-Vistoria/
│
├── backend/                      # Backend da aplicação (Node.js + Express)
│   ├── assets/                   # Recursos auxiliares
│   ├── controllers/              # Lógica das rotas
│   ├── models/                   # Modelos do banco de dados
│   ├── relatorios/               # Manipulação de relatórios
│   ├── routes/                   # Rotas da API
│   ├── uploads/                  # Upload de arquivos
│   ├── app.js                    # Configuração do Express
│   ├── db.js                     # Conexão com o banco
│   └── server.js                 # Inicialização do servidor
│
├── public/                       # Arquivos estáticos
│
├── src/                          # Frontend (React.js)
│   ├── pages/                    # Páginas por perfil de usuário
│   │   ├── Cadastro/
│   │   ├── HomeAdm/
│   │   ├── HomeCliente/
│   │   ├── HomeVistoriador/
│   │   │   ├── CriarRelatorio/
│   │   │   ├── IniciarVistoria/
│   │   │   ├── ReagendarVistoria/
│   │   │   └── RealizarVistoria/
│   │   ├── Inicial/
│   │   └── Login/
│   ├── utils/
│   ├── App.jsx
│   ├── index.jsx
│   └── main.jsx
│
├── .gitignore
├── eslint.config.js
├── package.json
├── package-lock.json
├── README.md
├── script.sql                    # Script de criação do banco de dados
└── vite.config.js

```

## 🚀 Como rodar o projeto localmente

Requisitos:
- Node.js (versão 18 ou superior)
- Conta no Supabase
- Git

### 1. Clone o repositório

```bash
git clone https://github.com/PRabeIo/CIVIS-Sistema_de_Vistoria
```

### 2. Instale as dependências do frontend/backend

```bash
npm install
```

### 3. Configure o banco de dados no Supabase

- Crie um novo projeto no Supabase
- Acesse o SQL Editor
- Execute o script presente no arquivo script.sql
- Copie a connection string do banco

---

### 4. Configure as variáveis de ambiente

Crie um arquivo `.env` com as credenciais do seu projeto no Supabase:

```bash
DATABASE_URL=postgresql://postgres:xxxxxxxxx@db.xxxxxxxxxxxxxx.supabase.co:5432/postgres
PORT=3001
SUPABASE_SERVICE_ROLE_KEY=sua-public-anon-key

OBS: O servidor usa a porta definida como 3001 para desenvolvimento local
```

### 5. Inicie a aplicação

Inicie o frontend.

No terminal, execute: 
```bash
npm run dev
```
O sistema estará acessível por padrão em `http://localhost:5173`

Agora inicie o backend: 

```bash
cd backend
node server.js 
```
### 6. Acesse onde está hospedado

Acesse http://localhost:5173 no navegador e você verá 

## 🧱 Stack Tecnológico

| Camada         | Tecnologia                |
| -------------- | ------------------------- |
| Frontend       | React.js + Vite           |
| Backend        | Node.js + Express.js      |
| Banco de Dados | PostgreSQL via Supabase   |
| Autenticação   | Supabase Auth + JWT       |
| Armazenamento  | Upload local (`/uploads`) |

---

## 🧪 Status do Projeto

- Sistema funcional
- Fluxo completo de vistorias implementado
- Melhorias planejadas

---

### Funcionalidades removidas temporariamente

Algumas funcionalidades aplicadas anteriormente foram desativadas por mudanças em serviços externos, não por limitações técnicas do sistema:

- Envio automático de e-mails via SMTP do Gmail  
  Removido devido às novas políticas de segurança do Google

- Geração automática de relatórios utilizando OpenAI  
  Removida por dependência de créditos da API

Essas funcionalidades podem ser reimplementadas futuramente utilizando:
- Serviços de e-mail dedicados (SendGrid, Resend, etc.)
- APIs de IA com controle de custo

Diagramas de casos de uso, classes e atividades foram desenvolvidos durante o projeto, mas não foram incluídos neste repositório.
