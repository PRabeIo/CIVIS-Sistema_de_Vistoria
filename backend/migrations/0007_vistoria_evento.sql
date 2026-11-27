-- 0007_vistoria_evento (F1 + D5): auditoria das transições de status e status "Vistoria Cancelada".
--
-- Toda mudança de status passa pela máquina de estados (src/domain/vistoriaStatus.ts), que grava
-- uma linha aqui na mesma transação. O gatilho abaixo garante isso no banco: um UPDATE que mude
-- o status sem a marca `civis.transicao = on` (posta pela máquina com SET LOCAL) é recusado.
-- Uma migration futura que precise corrigir status em massa deve fazer
-- `SELECT set_config('civis.transicao', 'on', true)` antes, na mesma transação.

ALTER TABLE public.vistoria DROP CONSTRAINT vistoria_status_chk;
ALTER TABLE public.vistoria ADD CONSTRAINT vistoria_status_chk CHECK (status IN (
  'Aguardando Agendamento da Vistoria',
  'Vistoria Agendada',
  'Em Andamento',
  'Aguardando Validação',
  'Vistoria Reagendada',
  'Vistoria Finalizada',
  'Vistoria Validada',
  'Vistoria Rejeitada',
  'Vistoria Cancelada'
));

CREATE TABLE public.vistoria_evento (
  id BIGSERIAL PRIMARY KEY,
  idvistoria INT NOT NULL REFERENCES public.vistoria(idvistoria) ON DELETE CASCADE,
  acao VARCHAR(30) NOT NULL,
  status_de VARCHAR(40),            -- NULL na criação da vistoria
  status_para VARCHAR(40) NOT NULL,
  usuario_id INT REFERENCES public.usuario(id) ON DELETE SET NULL, -- NULL = sistema
  papel VARCHAR(20),                -- papel de quem agiu, guardado mesmo se o usuário sair
  motivo TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vistoria_evento_vistoria ON public.vistoria_evento(idvistoria, criado_em);

-- Vistorias que já existem ganham um evento de criação (estado atual, sem histórico anterior).
INSERT INTO public.vistoria_evento (idvistoria, acao, status_de, status_para, motivo)
SELECT idvistoria, 'importar', NULL, status, 'Estado registrado na criação da auditoria (sem histórico anterior).'
FROM public.vistoria;

CREATE FUNCTION public.vistoria_status_guard() RETURNS trigger AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND current_setting('civis.transicao', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Mudança de status da vistoria % (% -> %) fora da máquina de estados', OLD.idvistoria, OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vistoria_status_guard
  BEFORE UPDATE OF status ON public.vistoria
  FOR EACH ROW EXECUTE FUNCTION public.vistoria_status_guard();
