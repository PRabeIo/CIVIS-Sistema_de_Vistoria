-- 0003_sessao (S5): sessões revogáveis.
-- O refresh token fica num cookie httpOnly; aqui só o hash SHA-256 dele.
-- O access token (15 min) carrega o id da sessão; o middleware confere a sessão a cada requisição,
-- então revogar (logout, troca de senha, mudança de papel, exclusão) corta o acesso na hora.

CREATE TABLE public.sessao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id INT NOT NULL REFERENCES public.usuario(id) ON DELETE CASCADE,
  refresh_hash CHAR(64) NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_uso_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_em TIMESTAMPTZ NOT NULL,
  revogada_em TIMESTAMPTZ,
  user_agent VARCHAR(300),
  ip VARCHAR(64),
  CONSTRAINT sessao_refresh_hash_key UNIQUE (refresh_hash)
);

CREATE INDEX idx_sessao_usuario_ativas ON public.sessao(usuario_id) WHERE revogada_em IS NULL;
