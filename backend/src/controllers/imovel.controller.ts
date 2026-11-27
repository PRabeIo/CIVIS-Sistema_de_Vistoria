import type { Request, Response } from 'express';
import * as imovelService from '../services/imovel.service';
import { paramsId, validar } from '../validacao/comum';
import * as schemas from '../validacao/schemas';
import { comNulos, ou404, usuarioDe } from './_http';

/** POST /imoveis: cria o imóvel e a vistoria inicial. */
export async function criar(req: Request, res: Response) {
  const dados = validar(schemas.imovelCriacao, req.body);
  return res.status(201).json(await imovelService.criarImovelComVistoria(comNulos(dados, ['bloco']), usuarioDe(req)));
}

/** GET /imoveis?empreendimentoid=123 */
export async function listarPorEmpreendimento(req: Request, res: Response) {
  const { empreendimentoid } = validar(schemas.queryEmpreendimento, req.query);
  return res.status(200).json(await imovelService.listarPorEmpreendimento(empreendimentoid));
}

/** GET /imoveis/orfaos?empreendimentoid=123 (consistência: imóveis sem vistoria) */
export async function listarOrfaos(req: Request, res: Response) {
  const { empreendimentoid } = validar(schemas.queryEmpreendimento, req.query);
  return res.status(200).json(await imovelService.listarOrfaosSemVistoria(empreendimentoid));
}

export async function listarTodos(_req: Request, res: Response) {
  return res.status(200).json(await imovelService.listarTodosComDados());
}

export async function listarVistoriasDoCliente(req: Request, res: Response) {
  const { idcliente } = validar(paramsId('idcliente', 'ID do cliente'), req.params);
  return res.status(200).json(await imovelService.listarVistoriasDosImoveisDoCliente(idcliente));
}

export async function atualizar(req: Request, res: Response) {
  const { idimovel } = validar(paramsId('idimovel', 'ID do imóvel'), req.params);
  const dados = validar(schemas.imovelAtualizacao, req.body);
  const campos = ['descricao', 'bloco', 'numero', 'idempreendimento', 'vistoriasrealizadas'] as const;
  const atualizado = await imovelService.atualizarImovel(idimovel, comNulos(dados, campos));
  return res.status(200).json(ou404(atualizado, 'Imóvel não encontrado.'));
}

/** GET /imoveis/:idimovel (admin) */
export async function buscarPorId(req: Request, res: Response) {
  const { idimovel } = validar(paramsId('idimovel', 'ID do imóvel'), req.params);
  return res.status(200).json(ou404(await imovelService.buscarPorId(idimovel), 'Imóvel não encontrado.'));
}

/** DELETE /imoveis/:idimovel (admin). B6: bloqueia se houver vistoria em andamento ou realizada. */
export async function deletar(req: Request, res: Response) {
  const { idimovel } = validar(paramsId('idimovel', 'ID do imóvel'), req.params);
  ou404(await imovelService.deletarImovel(idimovel), 'Imóvel não encontrado.');
  return res.status(200).json({ message: 'Imóvel excluído com sucesso.' });
}

export async function listarDisponiveis(req: Request, res: Response) {
  const { idcliente } = validar(paramsId('idcliente', 'ID do cliente'), req.params);
  return res.status(200).json(await imovelService.listarDisponiveisParaAgendamento(idcliente));
}

export async function listarMeusImoveis(req: Request, res: Response) {
  return res.status(200).json(await imovelService.listarMeusImoveis(usuarioDe(req).sub));
}

export async function buscarMeuImovelPorId(req: Request, res: Response) {
  const { idimovel } = validar(paramsId('idimovel', 'ID do imóvel'), req.params);
  const imovel = await imovelService.buscarMeuImovelPorId(usuarioDe(req).sub, idimovel);
  return res.status(200).json(ou404(imovel, 'Imóvel não encontrado (ou não pertence ao cliente).'));
}
