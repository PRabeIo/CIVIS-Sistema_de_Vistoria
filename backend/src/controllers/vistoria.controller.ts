// Regras de status continuam no vistoria.service (máquina de estados vem na Fase 2).
import type { Request, Response } from 'express';
import * as storage from '../services/storage.service';
import * as vistoriaService from '../services/vistoria.service';
import { paramsId, validar } from '../validacao/comum';
import * as schemas from '../validacao/schemas';
import { ou404, usuarioDe } from './_http';

const params = paramsId('idvistoria', 'ID da vistoria');
const idDe = (req: Request) => validar(params, req.params).idvistoria;

export async function listar(_req: Request, res: Response) {
  return res.status(200).json(await vistoriaService.listarTodas());
}

export async function buscarPorId(req: Request, res: Response) {
  const vistoria = await vistoriaService.buscarPorIdComAcesso(idDe(req), usuarioDe(req));
  return res.status(200).json(ou404(vistoria, 'Vistoria não encontrada ou sem permissão.'));
}

/**
 * GET /vistorias/:idvistoria/relatorio (S2): entrega o PDF só para quem pode ver a vistoria.
 * Storage local: a API envia o arquivo. Supabase: redireciona para uma URL assinada de 10 min.
 */
export async function relatorio(req: Request, res: Response) {
  const id = idDe(req);
  const vistoria = ou404(
    await vistoriaService.buscarPorIdComAcesso(id, usuarioDe(req)),
    'Vistoria não encontrada ou sem permissão.',
  );
  const chave = ou404(vistoria.relatorio_arquivo as string | null, 'Esta vistoria ainda não tem relatório.');
  const acesso = ou404(await storage.acesso(chave), 'Arquivo do relatório não encontrado.');

  res.setHeader('Cache-Control', 'private, no-store');
  if (acesso.tipo === 'url') return res.redirect(302, acesso.url);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="relatorio-vistoria-${id}.pdf"`);
  // o visualizador de PDF do navegador precisa de uma CSP menos restrita que a padrão da API
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:; frame-ancestors 'self'");
  return res.sendFile(acesso.caminho);
}

// ---------- Cliente: listas ----------

export async function minhas(req: Request, res: Response) {
  return res.status(200).json(await vistoriaService.listarMinhas(usuarioDe(req).sub));
}

export async function pendentesAgendamentoMe(req: Request, res: Response) {
  return res.status(200).json(await vistoriaService.pendentesAgendamentoCliente(usuarioDe(req).sub));
}

export async function pendentesValidacaoMe(req: Request, res: Response) {
  return res.status(200).json(await vistoriaService.pendentesValidacaoCliente(usuarioDe(req).sub));
}

export async function aguardandoValidacaoMe(req: Request, res: Response) {
  return res.status(200).json(await vistoriaService.aguardandoValidacaoCliente(usuarioDe(req).sub));
}

// ---------- Cliente: ações ----------

export async function agendar(req: Request, res: Response) {
  const id = idDe(req);
  const dados = validar(schemas.agendamento, req.body);
  const v = await vistoriaService.agendar(id, usuarioDe(req).sub, dados);
  return res.status(200).json(ou404(v, 'Vistoria não encontrada ou status inválido para agendar.'));
}

export async function reagendar(req: Request, res: Response) {
  const id = idDe(req);
  const dados = validar(schemas.agendamento, req.body);
  const v = await vistoriaService.reagendar(id, usuarioDe(req).sub, dados);
  return res.status(200).json(ou404(v, 'Vistoria não encontrada ou status inválido para reagendamento.'));
}

export async function validarVistoria(req: Request, res: Response) {
  ou404(
    await vistoriaService.validar(idDe(req), usuarioDe(req).sub),
    'Vistoria não encontrada ou status inválido para validar.',
  );
  return res.status(200).json({ message: 'Vistoria validada com sucesso.' });
}

export async function rejeitar(req: Request, res: Response) {
  const v = await vistoriaService.rejeitar(idDe(req), usuarioDe(req).sub);
  return res.status(200).json(ou404(v, 'Vistoria não encontrada ou status inválido para rejeitar.'));
}

// ---------- Vistoriador ----------

export async function disponiveisVistoriador(_req: Request, res: Response) {
  return res.json(await vistoriaService.listarDisponiveisVistoriador());
}

export async function minhasVistoriador(req: Request, res: Response) {
  return res.status(200).json(await vistoriaService.listarMinhasVistoriador(usuarioDe(req).sub));
}

export async function iniciar(req: Request, res: Response) {
  const v = await vistoriaService.iniciar(idDe(req), usuarioDe(req).sub);
  return res.status(200).json(ou404(v, 'Vistoria não encontrada ou indisponível para iniciar.'));
}

export async function finalizar(req: Request, res: Response) {
  const v = await vistoriaService.finalizar(idDe(req), usuarioDe(req).sub);
  return res.status(200).json(ou404(v, 'Vistoria não encontrada, status inválido ou você não tem permissão.'));
}

// ---------- Admin ----------

export async function atualizar(req: Request, res: Response) {
  const id = idDe(req);
  const dados = validar(schemas.vistoriaAtualizacaoAdmin, req.body);
  ou404(await vistoriaService.atualizar(id, dados), 'Vistoria não encontrada.');
  return res.status(200).json({ message: 'Vistoria atualizada com sucesso.' });
}

export async function deletar(req: Request, res: Response) {
  ou404(await vistoriaService.deletar(idDe(req)), 'Vistoria não encontrada.');
  return res.status(200).json({ message: 'Vistoria excluída com sucesso.' });
}

// nome usado pelas rotas (`validar` colide com o helper de validação)
export { validarVistoria as validar };
