-- 0005_assinatura_vistoriador (B12): assinatura opcional do vistoriador, usada no fim do PDF.
-- Fica no banco (imagem pequena, até 1 MB) para não ser servida por /uploads, que é público.
-- Só JPEG/PNG (formatos que o PDFKit desenha).

ALTER TABLE public.funcionario
  ADD COLUMN assinatura BYTEA,
  ADD COLUMN assinatura_tipo VARCHAR(20),
  ADD CONSTRAINT funcionario_assinatura_tipo_chk
    CHECK (assinatura_tipo IS NULL OR assinatura_tipo IN ('image/jpeg', 'image/png'));
