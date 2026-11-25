-- 0002_usuario_unificado (D1 / DEC-1)
--
-- Identidade única: e-mail, senha e papel ficam em `usuario`. `cliente` e `funcionario` viram
-- perfis 1:1 cujo id É o usuario.id (mesmo espaço de ids: um id nunca é de dois usuários).
-- As tabelas `administrador` e `vistoriador` saem; o cargo passa a ser `usuario.papel`.
--
-- Os nomes de coluna dos perfis (cliente.idcliente, funcionario.id) foram mantidos para não
-- quebrar os JOINs de vistoria/imóvel; a padronização de nomes fica para a Fase 2.
--
-- DEC-4: o banco só tem dados de teste, por isso esta migration APAGA os dados existentes
-- em vez de migrá-los. Rode `npm run seed` depois.

TRUNCATE vistoria, relatoriotecnico, imovel, cliente, administrador, vistoriador, funcionario
  RESTART IDENTITY CASCADE;

CREATE TABLE public.usuario (
  id SERIAL PRIMARY KEY,
  email CITEXT NOT NULL,
  senha_hash VARCHAR(100) NOT NULL,
  papel VARCHAR(20) NOT NULL
    CONSTRAINT usuario_papel_chk CHECK (papel IN ('admin', 'vistoriador', 'cliente')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_login_em TIMESTAMPTZ,
  CONSTRAINT usuario_email_key UNIQUE (email)
);

-- Cargos viram papel
DROP TABLE public.administrador;
DROP TABLE public.vistoriador CASCADE; -- derruba vistoria_idvistoriador_fkey

-- CLIENTE: perfil 1:1
ALTER TABLE public.cliente DROP COLUMN email, DROP COLUMN senha;
ALTER TABLE public.cliente ALTER COLUMN idcliente DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.cliente_idcliente_seq;
ALTER TABLE public.cliente
  ADD CONSTRAINT cliente_idcliente_usuario_fkey
    FOREIGN KEY (idcliente) REFERENCES public.usuario(id) ON DELETE CASCADE;

-- FUNCIONARIO: perfil 1:1 (admin e vistoriador)
ALTER TABLE public.funcionario DROP COLUMN email, DROP COLUMN senha;
ALTER TABLE public.funcionario ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.funcionario_id_seq;
ALTER TABLE public.funcionario
  ADD CONSTRAINT funcionario_id_usuario_fkey
    FOREIGN KEY (id) REFERENCES public.usuario(id) ON DELETE CASCADE;

-- VISTORIA: o vistoriador agora é um funcionário (o papel é validado na aplicação)
ALTER TABLE public.vistoria
  ADD CONSTRAINT vistoria_idvistoriador_fkey
    FOREIGN KEY (idvistoriador) REFERENCES public.funcionario(id) ON DELETE SET NULL;

CREATE INDEX idx_usuario_papel ON public.usuario(papel);
