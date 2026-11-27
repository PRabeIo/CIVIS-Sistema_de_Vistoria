import type { Request, Response } from 'express';
import { AppError } from '../domain/erros';
import * as clienteService from '../services/cliente.service';
import { paramsId, validar } from '../validacao/comum';
import * as schemas from '../validacao/schemas';
import { limparCookiesSessao } from './_cookies';
import { limparUploadsSeFalhar, ou404, usuarioDe } from './_http';

const NAO_ENCONTRADO = 'Cliente não encontrado.';
const params = paramsId('id', 'ID do cliente');

/** POST /clientes/cadastro (público): exige o aceite dos termos (S11). */
export async function cadastroPublico(req: Request, res: Response) {
  const dados = validar(schemas.clienteCadastro, req.body);
  return res.status(201).json(await clienteService.criarCliente(dados));
}

/** POST /clientes (admin). */
export async function criar(req: Request, res: Response) {
  const dados = validar(schemas.clienteCriacaoAdmin, req.body);
  return res.status(201).json(await clienteService.criarCliente(dados));
}

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

/** GET /clientes/me/dados (S11): baixa os próprios dados em JSON. */
export async function exportarMeusDados(req: Request, res: Response) {
  const { sub } = usuarioDe(req);
  const dados = await clienteService.exportarMeusDados(sub);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Disposition', 'attachment; filename="meus-dados-civis.json"');
  return res.status(200).json(dados);
}

/** DELETE /clientes/me (S11): exclui ou anonimiza a própria conta e encerra a sessão. */
export async function excluirMinhaConta(req: Request, res: Response) {
  const { sub } = usuarioDe(req);
  const { senha } = validar(schemas.exclusaoPropriaConta, req.body);
  const { modo } = await clienteService.excluirMinhaConta(sub, senha);
  limparCookiesSessao(res);
  return res.status(200).json({
    modo,
    message:
      modo === 'excluida'
        ? 'Sua conta e seus dados foram excluídos.'
        : 'Sua conta foi encerrada e seus dados pessoais foram apagados. As vistorias ficam com a construtora, sem identificação.',
  });
}
