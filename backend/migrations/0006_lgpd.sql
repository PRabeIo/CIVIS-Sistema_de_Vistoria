-- 0006_lgpd (S11): aceite dos termos e exclusão da conta pelo próprio titular.
--
-- termos_aceitos_em / termos_versao: gravados no cadastro público (checkbox obrigatório).
-- Clientes criados pelo admin ficam NULL até aceitarem (a base legal é o contrato com a construtora).
--
-- anonimizado_em: quando o cliente exclui a própria conta e já tem vistorias, os dados pessoais são
-- apagados mas as vistorias/relatórios ficam (obrigação da construtora), ligados a um titular anônimo.

ALTER TABLE public.cliente
  ADD COLUMN termos_aceitos_em TIMESTAMPTZ,
  ADD COLUMN termos_versao VARCHAR(20),
  ADD COLUMN anonimizado_em TIMESTAMPTZ;
