// F1: as ações de status passam pela máquina de estados (domain/vistoriaStatus + transicao.service).
import type { Request, Response } from 'express';
import { acoesDisponiveis, type VistoriaEstado } from '../domain/vistoriaStatus';
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

/** Detalhe da vistoria + `acoes`: o que o usuário pode fazer agora (a tela mostra só esses botões). */
export async function buscarPorId(req: Request, res: Response) {
  const usuario = usuarioDe(req);
  const vistoria = ou404(
    await vistoriaService.buscarPorIdComAcesso(idDe(req), usuario),
    'Vistoria não encontrada ou sem permissão.',
  );
  return res.status(200).json({ ...vistoria, acoes: acoesDisponiveis(vistoria as unknown as VistoriaEstado, usuario) });
}

/** GET /vistorias/:id/eventos (D5): linha do tempo, para quem pode ver a vistoria. */
export async function eventos(req: Request, res: Response) {
  const lista = await vistoriaService.eventos(idDe(req), usuarioDe(req));
  return res.status(200).json(ou404(lista, 'Vistoria não encontrada ou sem permissão.'));
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
  const dados = validar(schemas.agendamento, req.body);
  return res.status(200).json(await vistoriaService.agendar(idDe(req), usuarioDe(req), dados));
}

export async function reagendar(req: Request, res: Response) {
  const dados = validar(schemas.reagendamento, req.body);
  return res.status(200).json(await vistoriaService.reagendar(idDe(req), usuarioDe(req), dados));
}

export async function validarVistoria(req: Request, res: Response) {
  await vistoriaService.validar(idDe(req), usuarioDe(req));
  return res.status(200).json({ message: 'Vistoria validada com sucesso.' });
}

export async function rejeitar(req: Request, res: Response) {
  const { motivo } = validar(schemas.acaoComMotivo, req.body);
  return res.status(200).json(await vistoriaService.rejeitar(idDe(req), usuarioDe(req), motivo));
}

// ---------- Vistoriador ----------

export async function disponiveisVistoriador(_req: Request, res: Response) {
  return res.json(await vistoriaService.listarDisponiveisVistoriador());
}

export async function minhasVistoriador(req: Request, res: Response) {
  return res.status(200).json(await vistoriaService.listarMinhasVistoriador(usuarioDe(req).sub));
}

export async function iniciar(req: Request, res: Response) {
  return res.status(200).json(await vistoriaService.iniciar(idDe(req), usuarioDe(req)));
}

export async function finalizar(req: Request, res: Response) {
  return res.status(200).json(await vistoriaService.finalizar(idDe(req), usuarioDe(req)));
}

// ---------- Admin ----------

export async function atualizar(req: Request, res: Response) {
  const id = idDe(req);
  const dados = validar(schemas.vistoriaAtualizacaoAdmin, req.body);
  ou404(await vistoriaService.atualizar(id, dados), 'Vistoria não encontrada.');
  return res.status(200).json({ message: 'Vistoria atualizada com sucesso.' });
}

/** PUT /vistorias/:id/cancelar (admin, F1/F7): exige motivo. */
export async function cancelar(req: Request, res: Response) {
  const { motivo } = validar(schemas.acaoComMotivo, req.body);
  return res.status(200).json(await vistoriaService.cancelar(idDe(req), usuarioDe(req), motivo));
}

export async function deletar(req: Request, res: Response) {
  ou404(await vistoriaService.deletar(idDe(req)), 'Vistoria não encontrada.');
  return res.status(200).json({ message: 'Vistoria excluída com sucesso.' });
}

// nome usado pelas rotas (`validar` colide com o helper de validação)
export { validarVistoria as validar };
