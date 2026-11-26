import type { Request, Response } from 'express';
import * as empreendimentoService from '../services/empreendimento.service';
import { paramsId, validar } from '../validacao/comum';
import * as schemas from '../validacao/schemas';
import { comNulos, limparUploadsSeFalhar, ou404 } from './_http';

const CAMPOS = ['nome', 'construtora', 'estado', 'cidade', 'cep', 'rua'] as const;

const NAO_ENCONTRADO = 'Empreendimento não encontrado.';
const params = paramsId('id', 'ID do empreendimento');

export async function criar(req: Request, res: Response) {
  const dados = await limparUploadsSeFalhar(req, () => validar(schemas.empreendimentoCriacao, req.body));
  const empreendimento = await limparUploadsSeFalhar(req, () =>
    empreendimentoService.criar({ ...comNulos(dados, CAMPOS), anexos: req.file?.filename ?? null }),
  );
  return res.status(201).json(empreendimento);
}

export async function listar(_req: Request, res: Response) {
  return res.status(200).json(await empreendimentoService.listar());
}

export async function buscarPorId(req: Request, res: Response) {
  const { id } = validar(params, req.params);
  return res.status(200).json(ou404(await empreendimentoService.buscarPorId(id), NAO_ENCONTRADO));
}

export async function listarImoveis(req: Request, res: Response) {
  const { id } = validar(params, req.params);
  return res.status(200).json(await empreendimentoService.listarImoveisDoEmpreendimento(id));
}

export async function atualizar(req: Request, res: Response) {
  const { id, dados } = await limparUploadsSeFalhar(req, () => ({
    id: validar(params, req.params).id,
    dados: validar(schemas.empreendimentoAtualizacao, req.body),
  }));
  const ok = await limparUploadsSeFalhar(req, () =>
    empreendimentoService.atualizar(id, { ...comNulos(dados, CAMPOS), anexos: req.file?.filename ?? null }),
  );
  ou404(ok, NAO_ENCONTRADO);
  return res.status(200).json({ message: 'Empreendimento atualizado com sucesso.' });
}

export async function deletar(req: Request, res: Response) {
  const { id } = validar(params, req.params);
  ou404(await empreendimentoService.deletar(id), 'Empreendimento não encontrado para exclusão.');
  return res.status(200).json({ message: 'Empreendimento excluído com sucesso.' });
}
