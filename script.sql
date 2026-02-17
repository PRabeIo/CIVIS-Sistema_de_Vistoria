-- ============================================================
-- CIVIS - (Supabase/Postgres)
-- - Novo banco do zero
-- ============================================================

-- (Opcional) Garantir schema public
-- CREATE SCHEMA IF NOT EXISTS public;

-- (Opcional) Email sem diferenciar maiúsculo/minúsculo (recomendado)
CREATE EXTENSION IF NOT EXISTS citext;

-- =========================
-- 1) FUNCIONARIO
-- =========================
CREATE TABLE IF NOT EXISTS public.funcionario (
  id SERIAL PRIMARY KEY,
  cpf VARCHAR(14) UNIQUE NOT NULL,
  email CITEXT UNIQUE NOT NULL,
  nome VARCHAR(100) NOT NULL,
  senha VARCHAR(100) NOT NULL,
  telefone VARCHAR(20),
  imagemdeperfil TEXT
);

-- =========================
-- 2) ADMINISTRADOR (cargo)
-- =========================
CREATE TABLE IF NOT EXISTS public.administrador (
  idadministrador INT PRIMARY KEY,
  CONSTRAINT administrador_idadministrador_fkey
    FOREIGN KEY (idadministrador)
    REFERENCES public.funcionario(id)
    ON DELETE CASCADE
);

-- =========================
-- 3) VISTORIADOR (cargo)
-- =========================
CREATE TABLE IF NOT EXISTS public.vistoriador (
  idvistoriador INT PRIMARY KEY,
  CONSTRAINT vistoriador_idvistoriador_fkey
    FOREIGN KEY (idvistoriador)
    REFERENCES public.funcionario(id)
    ON DELETE CASCADE
);

-- =========================
-- 4) CLIENTE
-- =========================
CREATE TABLE IF NOT EXISTS public.cliente (
  idcliente SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  cpf VARCHAR(14) UNIQUE NOT NULL,
  email CITEXT UNIQUE NOT NULL,
  senha VARCHAR(100) NOT NULL,
  telefone VARCHAR(20),
  imagemdeperfil TEXT
);

-- =========================
-- 5) EMPREENDIMENTO
-- =========================
CREATE TABLE IF NOT EXISTS public.empreendimento (
  idempreendimento SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  construtora VARCHAR(100),
  cidade VARCHAR(100),
  estado VARCHAR(50),
  cep VARCHAR(20),
  rua VARCHAR(150),
  anexos TEXT
);

-- =========================
-- 6) IMOVEL
-- =========================
CREATE TABLE IF NOT EXISTS public.imovel (
  idimovel SERIAL PRIMARY KEY,
  descricao TEXT,
  vistoriasrealizadas INT DEFAULT 0,
  observacoes TEXT,
  bloco VARCHAR(50),
  numero VARCHAR(20),
  idempreendimento INT,
  idcliente INT,
  CONSTRAINT imovel_idempreendimento_fkey
    FOREIGN KEY (idempreendimento)
    REFERENCES public.empreendimento(idempreendimento)
    ON DELETE SET NULL,
  CONSTRAINT imovel_idcliente_fkey
    FOREIGN KEY (idcliente)
    REFERENCES public.cliente(idcliente)
    ON DELETE SET NULL
);

-- =========================
-- 7) ENUM de status (profissional)
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_vistoria') THEN
    CREATE TYPE public.status_vistoria AS ENUM (
      'Aguardando Agendamento da Vistoria',
      'Vistoria Agendada',
      'Em Andamento',
      'Aguardando Validação',
      'Vistoria Reagendada',
      'Vistoria Finalizada',
      'Vistoria Validada',
      'Vistoria Rejeitada'
    );
  END IF;
END$$;

-- =========================
-- 8) VISTORIA
-- - idvistoriador pode ser NULL no início
-- - status com default
-- =========================
CREATE TABLE IF NOT EXISTS public.vistoria (
  idvistoria SERIAL PRIMARY KEY,

  idcliente INT NOT NULL,
  idimovel INT NOT NULL,
  idvistoriador INT NULL, -- caminho A: pode ser null inicialmente

  dataagendada TIMESTAMPTZ,
  datahorainicio TIMESTAMPTZ,
  datahorafim TIMESTAMPTZ,

  status public.status_vistoria NOT NULL DEFAULT 'Aguardando Agendamento da Vistoria',

  condicoesclimaticas VARCHAR(100),
  imprevistos TEXT,
  observacoes TEXT,

  relatorio_url TEXT,

  CONSTRAINT vistoria_idcliente_fkey
    FOREIGN KEY (idcliente)
    REFERENCES public.cliente(idcliente)
    ON DELETE CASCADE,

  CONSTRAINT vistoria_idimovel_fkey
    FOREIGN KEY (idimovel)
    REFERENCES public.imovel(idimovel)
    ON DELETE CASCADE,

  CONSTRAINT vistoria_idvistoriador_fkey
    FOREIGN KEY (idvistoriador)
    REFERENCES public.vistoriador(idvistoriador)
    ON DELETE SET NULL
);

-- =========================
-- 9) RELATORIO TECNICO
-- =========================
CREATE TABLE IF NOT EXISTS public.relatoriotecnico (
  idvistoria INT PRIMARY KEY,

  estadoconservacaoestrutura VARCHAR(50),
  estadoconservacaopintura VARCHAR(50),
  estadoinstalacaoeletrica VARCHAR(50),
  estadoinstalacaohidraulica VARCHAR(50),
  estadotelhado VARCHAR(50),
  estadopiso VARCHAR(50),

  segurancaportasjanelas BOOLEAN,
  funcionamentosistemaalarme BOOLEAN,
  presencapragas BOOLEAN,
  presencainfiltracoes BOOLEAN,

  anexos TEXT,

  CONSTRAINT relatoriotecnico_idvistoria_fkey
    FOREIGN KEY (idvistoria)
    REFERENCES public.vistoria(idvistoria)
    ON DELETE CASCADE
);

-- =========================
-- (Opcional) Índices úteis (performance)
-- =========================
CREATE INDEX IF NOT EXISTS idx_imovel_idcliente ON public.imovel(idcliente);
CREATE INDEX IF NOT EXISTS idx_imovel_idempreendimento ON public.imovel(idempreendimento);

CREATE INDEX IF NOT EXISTS idx_vistoria_idcliente ON public.vistoria(idcliente);
CREATE INDEX IF NOT EXISTS idx_vistoria_idimovel ON public.vistoria(idimovel);
CREATE INDEX IF NOT EXISTS idx_vistoria_idvistoriador ON public.vistoria(idvistoriador);
CREATE INDEX IF NOT EXISTS idx_vistoria_status ON public.vistoria(status);
