-- 0004_relatorio_privado (S2): o relatório deixa de ter URL pública.
-- A coluna passa a guardar só a CHAVE do arquivo num storage privado; o acesso é feito por
-- GET /api/vistorias/:id/relatorio, que confere a permissão e entrega o PDF (ou uma URL assinada).
--
-- DEC-4: as URLs públicas antigas eram de dados de teste e não são convertidas.

ALTER TABLE public.vistoria RENAME COLUMN relatorio_url TO relatorio_arquivo;
UPDATE public.vistoria SET relatorio_arquivo = NULL WHERE relatorio_arquivo LIKE 'http%';
