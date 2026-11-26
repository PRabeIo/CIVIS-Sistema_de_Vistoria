import type { Request, Response } from 'express';
import * as vistoriadorService from '../services/vistoriador.service';
import { paramsId, validar } from '../validacao/comum';
import { ou404 } from './_http';

export async function listar(_req: Request, res: Response) {
  return res.status(200).json(await vistoriadorService.listar());
}

export async function buscarPorId(req: Request, res: Response) {
  const { id } = validar(paramsId('id', 'ID do vistoriador'), req.params);
  return res.status(200).json(ou404(await vistoriadorService.buscarPorId(id), 'Vistoriador não encontrado.'));
}
