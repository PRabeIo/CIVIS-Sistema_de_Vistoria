import type { Request, Response } from 'express';
import { AppError } from '../domain/erros';
import * as clienteService from '../services/cliente.service';
import { paramsId, validar } from '../validacao/comum';
import * as schemas from '../validacao/schemas';
import { limparUploadsSeFalhar, ou404, usuarioDe } from './_http';

const NAO_ENCONTRADO = 'Cliente não encontrado.';
const params = paramsId('id', 'ID do cliente');

/** POST /clientes/cadastro (público) e POST /clientes (admin). */
export async function cadastroPublico(req: Request, res: Response) {
  const dados = validar(schemas.clienteCadastro, req.body);
  return res.status(201).json(await clienteService.criarCliente(dados));
}

export const criar = cadastroPublico;

export async function listar(_req: Request, res: Response) {
  return res.status(200).json(await clienteService.listarClientes());
}

export async function buscarPorId(req: Request, res: Response) {
  const { id } = validar(params, req.params);
  return res.status(200).json(ou404(await clienteService.buscarClientePorId(id), NAO_ENCONTRADO));
}

export async function atualizar(req: Request, res: Response) {
  const { id } = validar(params, req.params);
  const dados = validar(schemas.clienteAtualizacaoAdmin, req.body); // admin pode redefinir a senha
  return res.status(200).json(ou404(await clienteService.atualizarCliente(id, dados), NAO_ENCONTRADO));
}

export async function deletar(req: Request, res: Response) {
  const { id } = validar(params, req.params);
  validar(schemas.confirmacaoExclusao, req.body);
  ou404(await clienteService.deletarCliente(id), NAO_ENCONTRADO);
  return res.status(200).json({ message: 'Cliente excluído com sucesso.' });
}

/** PUT /clientes/:id/atualizar-com-imagem (admin, multipart). */
export async function atualizarComImagem(req: Request, res: Response) {
  const { id, dados } = await limparUploadsSeFalhar(req, () => ({
    id: validar(params, req.params).id,
    dados: validar(schemas.clienteAtualizacaoAdmin, req.body),
  }));
  const atualizado = await clienteService.atualizarClienteComImagem(id, dados, req.file?.filename ?? null);
  return res.status(200).json(ou404(atualizado, NAO_ENCONTRADO));
}

export async function me(req: Request, res: Response) {
  const { sub } = usuarioDe(req);
  return res.status(200).json(ou404(await clienteService.buscarMeuPerfil(sub), NAO_ENCONTRADO));
}

export async function atualizarMe(req: Request, res: Response) {
  const { sub } = usuarioDe(req);
  const dados = validar(schemas.meuPerfilAtualizacao, req.body);
  return res.status(200).json(ou404(await clienteService.atualizarMeuPerfil(sub, dados), NAO_ENCONTRADO));
}

export async function atualizarMeAvatar(req: Request, res: Response) {
  const { sub } = usuarioDe(req);
  if (!req.file) throw new AppError(400, 'VALIDACAO', 'Envie um arquivo no campo "imagemdeperfil".');
  return res.status(200).json(ou404(await clienteService.atualizarMeuAvatar(sub, req.file.filename), NAO_ENCONTRADO));
}

export async function atualizarMinhaSenha(req: Request, res: Response) {
  const { sub, sid } = usuarioDe(req);
  const { senhaAtual, senhaNova } = validar(schemas.trocaSenha, req.body);
  await clienteService.trocarMinhaSenha(sub, senhaAtual, senhaNova, sid);
  return res.status(200).json({ message: 'Senha alterada com sucesso.' });
}
