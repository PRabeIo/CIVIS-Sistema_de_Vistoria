import type { Request, Response } from 'express';
import { AppError } from '../domain/erros';
import * as funcionarioService from '../services/funcionario.service';
import { paramsId, validar } from '../validacao/comum';
import * as schemas from '../validacao/schemas';
import { limparUploadsSeFalhar, ou404, usuarioDe } from './_http';

const NAO_ENCONTRADO = 'Funcionário não encontrado.';
const params = paramsId('id', 'ID do funcionário');

export async function listar(_req: Request, res: Response) {
  return res.json(await funcionarioService.listarComCargo());
}

export async function criar(req: Request, res: Response) {
  const dados = validar(schemas.funcionarioCriacao, req.body);
  return res.status(201).json(await funcionarioService.criar(dados));
}

/** PUT /funcionarios/:id (admin, multipart com "imagemdeperfil" opcional). Troca de cargo muda o papel. */
export async function atualizar(req: Request, res: Response) {
  const { id, dados } = await limparUploadsSeFalhar(req, () => ({
    id: validar(params, req.params).id,
    dados: validar(schemas.funcionarioAtualizacao, req.body),
  }));
  const f = await funcionarioService.atualizar(id, dados, req.file?.filename ?? null, usuarioDe(req).sub);
  return res.json(ou404(f, NAO_ENCONTRADO));
}

export async function deletar(req: Request, res: Response) {
  const { id } = validar(params, req.params);
  validar(schemas.confirmacaoExclusao, req.body);
  ou404(await funcionarioService.deletar(id, usuarioDe(req).sub), NAO_ENCONTRADO);
  return res.json({ message: 'Funcionário deletado com sucesso.' });
}

export async function buscarPorId(req: Request, res: Response) {
  const { id } = validar(params, req.params);
  return res.json(ou404(await funcionarioService.buscarPorIdComCargo(id), NAO_ENCONTRADO));
}

export const perfil = buscarPorId;

export async function me(req: Request, res: Response) {
  const { sub } = usuarioDe(req);
  return res.status(200).json(ou404(await funcionarioService.buscarMeuPerfil(sub), NAO_ENCONTRADO));
}

export async function atualizarMe(req: Request, res: Response) {
  const { sub } = usuarioDe(req);
  const dados = validar(schemas.meuPerfilAtualizacao, req.body);
  return res.status(200).json(ou404(await funcionarioService.atualizarMeuPerfil(sub, dados), NAO_ENCONTRADO));
}

export async function atualizarMeuAvatar(req: Request, res: Response) {
  const { sub } = usuarioDe(req);
  const atualizado = await funcionarioService.atualizarMeuAvatar(sub, req.file?.filename ?? null);
  return res.status(200).json(ou404(atualizado, NAO_ENCONTRADO));
}

/** B12: assinatura do vistoriador usada no PDF do relatório. */
export async function minhaAssinatura(req: Request, res: Response) {
  const a = ou404(await funcionarioService.buscarMinhaAssinatura(usuarioDe(req).sub), 'Nenhuma assinatura cadastrada.');
  res.set('Content-Type', a.tipo);
  res.set('Cache-Control', 'private, no-store');
  return res.send(a.imagem);
}

export async function salvarMinhaAssinatura(req: Request, res: Response) {
  const arquivo = req.file;
  if (!arquivo?.buffer) throw new AppError(400, 'VALIDACAO', 'Envie a imagem da assinatura no campo "assinatura".');
  await funcionarioService.salvarMinhaAssinatura(usuarioDe(req).sub, arquivo.buffer, arquivo.mimetype);
  return res.status(200).json({ message: 'Assinatura salva.' });
}

export async function removerMinhaAssinatura(req: Request, res: Response) {
  await funcionarioService.removerMinhaAssinatura(usuarioDe(req).sub);
  return res.status(200).json({ message: 'Assinatura removida.' });
}

export async function atualizarMinhaSenha(req: Request, res: Response) {
  const { sub, sid } = usuarioDe(req);
  const { senhaAtual, senhaNova } = validar(schemas.trocaSenha, req.body);
  await funcionarioService.trocarMinhaSenha(sub, senhaAtual, senhaNova, sid);
  return res.status(200).json({ message: 'Senha alterada com sucesso.' });
}
