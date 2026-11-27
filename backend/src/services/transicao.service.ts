// F1 + D5: aplica a máquina de estados no banco e grava o evento de auditoria na mesma transação.
// Toda mudança de status da vistoria passa por `transicionar`; o gatilho da migration 0007 recusa
// qualquer UPDATE de status que não venha daqui.
import db from '../config/db';
import { emTransacao, type Executor } from '../config/transacao';
import { AppError } from '../domain/erros';
import {
  STATUS,
  TRANSICOES,
  verificarTransicao,
  type AcaoEvento,
  type AcaoVistoria,
  type Ator,
  type StatusVistoria,
} from '../domain/vistoriaStatus';

export type VistoriaRow = Record<string, unknown> & {
  idvistoria: number;
  idcliente: number;
  idvistoriador: number | null;
  status: StatusVistoria;
};

const NAO_ENCONTRADA = 'Vistoria não encontrada ou sem permissão.';
const MOTIVO_MAX = 1000;

export interface OpcoesTransicao {
  idvistoria: number;
  acao: AcaoVistoria;
  ator: Ator;
  motivo?: string | null;
  /**
   * Outras colunas a gravar junto com o status. Pode ser uma função da linha atual (travada),
   * para regras como "mantém o vistoriador se já houver".
   */
  campos?: Record<string, unknown> | ((atual: VistoriaRow) => Record<string, unknown>);
}

/** Libera a mudança de status nesta transação (o gatilho da migration 0007 confere). */
async function liberarMudancaDeStatus(tx: Executor): Promise<void> {
  await tx`SELECT set_config('civis.transicao', 'on', true)`;
}

export async function registrarEvento(
  ex: Executor,
  e: {
    idvistoria: number;
    acao: AcaoEvento;
    de: string | null;
    para: string;
    ator?: Ator | null;
    motivo?: string | null;
  },
): Promise<void> {
  await ex`
    INSERT INTO vistoria_evento (idvistoria, acao, status_de, status_para, usuario_id, papel, motivo)
    VALUES (${e.idvistoria}, ${e.acao}, ${e.de}, ${e.para}, ${e.ator?.sub ?? null}, ${e.ator?.papel ?? null},
            ${e.motivo ?? null})
  `;
}

function normalizarMotivo(acao: AcaoVistoria, motivo: string | null | undefined): string | null {
  const regra = TRANSICOES[acao];
  const m = typeof motivo === 'string' ? motivo.trim() : '';
  if (regra.motivo === 'obrigatorio' && !m) {
    throw new AppError(400, 'VALIDACAO', `Informe o motivo para ${regra.rotulo} a vistoria.`, { motivo: 'Obrigatório.' });
  }
  if (m.length > MOTIVO_MAX) {
    throw new AppError(400, 'VALIDACAO', `O motivo deve ter no máximo ${MOTIVO_MAX} caracteres.`, { motivo: 'Muito longo.' });
  }
  return regra.motivo === 'nao' ? null : m || null;
}

/**
 * Executa a ação: trava a vistoria, confere papel/responsável/status pela máquina de estados,
 * atualiza o status (e os `campos`) e grava o evento. Erros:
 * 404 se não existe ou o ator não é o responsável · 403 se o papel não pode · 409 se o status não permite.
 */
export async function transicionar(opts: OpcoesTransicao): Promise<VistoriaRow> {
  const regra = TRANSICOES[opts.acao];
  const motivo = normalizarMotivo(opts.acao, opts.motivo);

  return emTransacao(async (tx) => {
    const [atual] = await tx<VistoriaRow[]>`
      SELECT * FROM vistoria WHERE idvistoria = ${opts.idvistoria} FOR UPDATE
    `;
    if (!atual) throw new AppError(404, 'NAO_ENCONTRADO', NAO_ENCONTRADA);

    const r = verificarTransicao(opts.acao, atual, opts.ator);
    if (!r.ok) {
      if (r.erro === 'PAPEL') {
        throw new AppError(403, 'PROIBIDO', `Seu perfil não pode ${regra.rotulo} vistorias.`);
      }
      if (r.erro === 'RESPONSAVEL') throw new AppError(404, 'NAO_ENCONTRADO', NAO_ENCONTRADA);
      throw new AppError(
        409,
        'TRANSICAO_INVALIDA',
        `Não é possível ${regra.rotulo} uma vistoria com status "${atual.status}".`,
      );
    }

    const extras = typeof opts.campos === 'function' ? opts.campos(atual) : (opts.campos ?? {});
    await liberarMudancaDeStatus(tx);
    const [nova] = await tx<VistoriaRow[]>`
      UPDATE vistoria SET ${tx({ ...extras, status: r.para })}
      WHERE idvistoria = ${opts.idvistoria}
      RETURNING *
    `;
    await registrarEvento(tx, {
      idvistoria: opts.idvistoria,
      acao: opts.acao,
      de: atual.status,
      para: r.para,
      ator: opts.ator,
      motivo,
    });
    return nova;
  });
}

/** Cria a vistoria inicial de um imóvel (status "Aguardando Agendamento") com o evento de criação. */
export async function criarVistoria(
  ex: Executor,
  dados: { idimovel: number; idcliente: number },
  ator: Ator | null,
): Promise<VistoriaRow> {
  const [v] = await ex<VistoriaRow[]>`
    INSERT INTO vistoria (idimovel, idcliente, status)
    VALUES (${dados.idimovel}, ${dados.idcliente}, ${STATUS.aguardandoAgendamento})
    RETURNING *
  `;
  await registrarEvento(ex, { idvistoria: v.idvistoria, acao: 'criar', de: null, para: v.status, ator });
  return v;
}

export interface EventoVistoria {
  id: number;
  acao: string;
  status_de: string | null;
  status_para: string;
  papel: string | null;
  nome: string | null;
  motivo: string | null;
  criado_em: Date;
}

/** Linha do tempo da vistoria, da mais antiga para a mais recente, com o nome de quem agiu. */
export async function listarEventos(idvistoria: number): Promise<EventoVistoria[]> {
  return db<EventoVistoria[]>`
    SELECT e.id, e.acao, e.status_de, e.status_para, e.papel, e.motivo, e.criado_em,
           COALESCE(f.nome, c.nome) AS nome
    FROM vistoria_evento e
    LEFT JOIN funcionario f ON f.id = e.usuario_id
    LEFT JOIN cliente c ON c.idcliente = e.usuario_id
    WHERE e.idvistoria = ${idvistoria}
    ORDER BY e.criado_em, e.id
  `;
}
