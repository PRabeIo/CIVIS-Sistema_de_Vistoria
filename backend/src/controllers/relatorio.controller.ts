import type { Request, Response } from 'express';
import * as relatorioService from '../services/relatorio.service';
import { validar } from '../validacao/comum';
import * as schemas from '../validacao/schemas';
import { usuarioDe } from './_http';

/** POST /relatorio/gerar (vistoriador, multipart: idVistoria, comodos [JSON] e fotos). */
export async function gerarRelatorio(req: Request, res: Response) {
  const { idVistoria, comodos } = validar(schemas.relatorioGeracao, req.body);
  const resultado = await relatorioService.gerar({
    idVistoria,
    comodos,
    arquivos: Array.isArray(req.files) ? req.files : Object.values(req.files ?? {}).flat(),
    idVistoriadorToken: usuarioDe(req).sub,
  });
  return res.status(200).json(resultado);
}
