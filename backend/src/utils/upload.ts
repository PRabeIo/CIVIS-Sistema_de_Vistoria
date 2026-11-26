// S3: uploads seguros. Um só lugar define tipos aceitos, limites, nomes e checagem de conteúdo.
import { randomUUID } from 'crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { AppError } from '../domain/erros';

export const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
const MB = 1024 * 1024;

/** Tipos de imagem aceitos e a extensão gravada (nunca vem do nome original). */
const IMAGENS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/** Confere a "assinatura" (magic bytes) do arquivo: o mimetype enviado pelo cliente pode mentir. */
export function tipoPeloConteudo(inicio: Buffer): keyof typeof IMAGENS | null {
  if (inicio.length >= 3 && inicio[0] === 0xff && inicio[1] === 0xd8 && inicio[2] === 0xff) return 'image/jpeg';
  if (inicio.length >= 8 && inicio.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (inicio.length >= 12 && inicio.toString('ascii', 0, 4) === 'RIFF' && inicio.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

export type TipoImagem = keyof typeof IMAGENS;
const TODAS: readonly TipoImagem[] = ['image/jpeg', 'image/png', 'image/webp'];
/** O PDFKit só desenha JPEG e PNG: fotos e assinatura que vão para o relatório ficam nesses dois. */
export const IMAGENS_PDF: readonly TipoImagem[] = ['image/jpeg', 'image/png'];

const NOMES: Record<string, string> = { 'image/jpeg': 'JPEG', 'image/png': 'PNG', 'image/webp': 'WebP' };
function arquivoInvalido(tipos: readonly TipoImagem[] = TODAS) {
  const lista = tipos.map((t) => NOMES[t]);
  const texto = lista.length > 1 ? `${lista.slice(0, -1).join(', ')} ou ${lista.at(-1)}` : lista[0];
  return new AppError(400, 'ARQUIVO_INVALIDO', `Formato de arquivo não permitido. Envie imagens ${texto}.`);
}

function filtroImagens(tipos: readonly TipoImagem[]) {
  return (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if ((tipos as readonly string[]).includes(file.mimetype)) return cb(null, true);
    cb(arquivoInvalido(tipos));
  };
}

function lerInicio(file: Express.Multer.File): Buffer {
  if (file.buffer) return file.buffer.subarray(0, 12);
  const fd = fs.openSync(file.path, 'r');
  try {
    const buf = Buffer.alloc(12);
    const lidos = fs.readSync(fd, buf, 0, 12, 0);
    return buf.subarray(0, lidos);
  } finally {
    fs.closeSync(fd);
  }
}

function arquivosDa(req: Request): Express.Multer.File[] {
  return [
    ...(req.file ? [req.file] : []),
    ...(Array.isArray(req.files) ? req.files : Object.values(req.files ?? {}).flat()),
  ];
}

/** Depois do multer: recusa (e apaga) qualquer arquivo cujo conteúdo não bate com o tipo declarado. */
function conferirConteudo(tipos: readonly TipoImagem[] = TODAS) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const arquivos = arquivosDa(req);
    const invalido = arquivos.some((f) => tipoPeloConteudo(lerInicio(f)) !== f.mimetype);
    if (!invalido) return next();
    for (const f of arquivos) if (f.path) fs.promises.unlink(f.path).catch(() => {});
    next(arquivoInvalido(tipos));
  };
}

/** Avatar ou imagem gravada em disco em uploads/<pasta>, com nome UUID. */
export function uploadImagemEmDisco(pasta: string, campo: string, maxMB = 5): RequestHandler[] {
  const destino = path.join(UPLOADS_DIR, pasta);
  fs.mkdirSync(destino, { recursive: true });

  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, destino),
      filename: (_req, file, cb) => cb(null, `${randomUUID()}${IMAGENS[file.mimetype]}`),
    }),
    fileFilter: filtroImagens(TODAS),
    limits: { fileSize: maxMB * MB, files: 1, fields: 30 },
  });
  return [upload.single(campo), conferirConteudo()];
}

/** Uma imagem em memória (ex.: assinatura do vistoriador, guardada no banco). */
export function uploadImagemEmMemoria(
  campo: string,
  { maxMB = 1, tipos = TODAS }: { maxMB?: number; tipos?: readonly TipoImagem[] } = {},
): RequestHandler[] {
  const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: filtroImagens(tipos),
    limits: { fileSize: maxMB * MB, files: 1, fields: 10 },
  });
  return [upload.single(campo), conferirConteudo(tipos)];
}

/** Fotos da vistoria: em memória (vão direto para o PDF), só nos campos conhecidos e só JPEG/PNG. */
export function uploadFotosEmMemoria(
  campos: readonly string[],
  { maxMBPorFoto = 10, maxPorCampo = 10, maxTotal = 30 } = {},
): RequestHandler[] {
  const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: filtroImagens(IMAGENS_PDF),
    limits: { fileSize: maxMBPorFoto * MB, files: maxTotal, fields: 30 },
  });
  return [upload.fields(campos.map((name) => ({ name, maxCount: maxPorCampo }))), conferirConteudo(IMAGENS_PDF)];
}
