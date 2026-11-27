-- 0008_revisao_reagendamento (F2 + F3).
--
-- F2 (DEC-3): rejeitar não encerra mais a vistoria. Ela volta para "Em Revisão" (o vistoriador corrige
-- e reenvia o relatório) até MAX_REVISOES vezes; na rejeição seguinte vai para "Em Análise do Admin".
-- `revisoes` conta as rejeições do cliente.
--
-- F3: reagendar passa a ser "Agendada → Agendada" (antes do início, com motivo). Os status
-- "Vistoria Rejeitada" e "Vistoria Reagendada" deixam de existir; as linhas antigas (só dados de teste,
-- DEC-4) são convertidas, com evento no histórico.

ALTER TABLE public.vistoria ADD COLUMN revisoes INT NOT NULL DEFAULT 0;

-- Converte os status que saem (o gatilho da 0007 exige a marca da máquina de estados).
SELECT set_config('civis.transicao', 'on', true);

INSERT INTO public.vistoria_evento (idvistoria, acao, status_de, status_para, motivo)
SELECT idvistoria, 'importar', status,
       CASE status WHEN 'Vistoria Rejeitada' THEN 'Em Revisão' ELSE 'Vistoria Agendada' END,
       'Status convertido pela migration 0008 (F2/F3).'
FROM public.vistoria
WHERE status IN ('Vistoria Rejeitada', 'Vistoria Reagendada');

UPDATE public.vistoria SET status = 'Em Revisão', revisoes = 1 WHERE status = 'Vistoria Rejeitada';
UPDATE public.vistoria SET status = 'Vistoria Agendada' WHERE status = 'Vistoria Reagendada';

ALTER TABLE public.vistoria DROP CONSTRAINT vistoria_status_chk;
ALTER TABLE public.vistoria ADD CONSTRAINT vistoria_status_chk CHECK (status IN (
  'Aguardando Agendamento da Vistoria',
  'Vistoria Agendada',
  'Em Andamento',
  'Aguardando Validação',
  'Em Revisão',
  'Em Análise do Admin',
  'Vistoria Validada',
  'Vistoria Finalizada',
  'Vistoria Cancelada'
));
