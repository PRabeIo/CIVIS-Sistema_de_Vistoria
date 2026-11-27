// F1: máquina de estados da vistoria. Única fonte das transições permitidas e de quem pode fazê-las.
// O serviço `transicao.service.ts` aplica a regra no banco (com trava de linha) e grava o evento (D5).
// Regras de negócio que ainda vão mudar: rejeição com revisões (F2), reagendamento real (F3) e
// atribuição pelo admin (F5) — basta ajustar a tabela TRANSICOES.
import type { Papel } from './papel';

export const STATUS = {
  aguardandoAgendamento: 'Aguardando Agendamento da Vistoria',
  agendada: 'Vistoria Agendada',
  emAndamento: 'Em Andamento',
  aguardandoValidacao: 'Aguardando Validação',
  reagendada: 'Vistoria Reagendada',
  validada: 'Vistoria Validada',
  rejeitada: 'Vistoria Rejeitada',
  finalizada: 'Vistoria Finalizada',
  cancelada: 'Vistoria Cancelada',
} as const;

export type StatusVistoria = (typeof STATUS)[keyof typeof STATUS];

/** Mesma lista do CHECK `vistoria_status_chk` (migration 0007). */
export const STATUS_VISTORIA = Object.values(STATUS) as StatusVistoria[];

/** Status em que a vistoria acabou: nenhuma ação sai deles. */
export const STATUS_FINAIS: readonly StatusVistoria[] = [STATUS.finalizada, STATUS.cancelada];

export type AcaoVistoria =
  | 'agendar'
  | 'reagendar'
  | 'iniciar'
  | 'gerarRelatorio'
  | 'validar'
  | 'rejeitar'
  | 'finalizar'
  | 'cancelar';

/** Ação registrada no histórico sem ser uma transição (criação da vistoria). */
export type AcaoEvento = AcaoVistoria | 'criar' | 'importar';

type Motivo = 'obrigatorio' | 'opcional' | 'nao';

/**
 * Quem, além do papel, pode agir:
 * - `cliente`: o dono da vistoria;
 * - `vistoriadorAtribuido`: o vistoriador da vistoria;
 * - `vistoriadorOuPool`: o vistoriador da vistoria ou qualquer um se ela estiver sem vistoriador;
 * - `qualquer`: basta o papel (admin).
 */
type Responsavel = 'cliente' | 'vistoriadorAtribuido' | 'vistoriadorOuPool' | 'qualquer';

interface RegraAcao {
  /** Verbo usado nas mensagens: "Não é possível {rotulo} uma vistoria ..." */
  rotulo: string;
  papeis: readonly Papel[];
  responsavel: Responsavel;
  de: readonly StatusVistoria[];
  para: StatusVistoria;
  motivo: Motivo;
}

export const TRANSICOES: Record<AcaoVistoria, RegraAcao> = {
  agendar: {
    rotulo: 'agendar',
    papeis: ['cliente'],
    responsavel: 'cliente',
    de: [STATUS.aguardandoAgendamento],
    para: STATUS.agendada,
    motivo: 'nao',
  },
  // Comportamento atual mantido (cliente pede nova visita depois de rejeitar). O F3 troca por
  // "Agendada → Agendada, antes do início, com motivo" e o F2 refaz a rejeição.
  reagendar: {
    rotulo: 'reagendar',
    papeis: ['cliente'],
    responsavel: 'cliente',
    de: [STATUS.rejeitada],
    para: STATUS.reagendada,
    motivo: 'opcional',
  },
  iniciar: {
    rotulo: 'iniciar',
    papeis: ['vistoriador'],
    responsavel: 'vistoriadorOuPool',
    de: [STATUS.agendada, STATUS.reagendada],
    para: STATUS.emAndamento,
    motivo: 'nao',
  },
  gerarRelatorio: {
    rotulo: 'gerar o relatório de',
    papeis: ['vistoriador'],
    responsavel: 'vistoriadorAtribuido',
    de: [STATUS.emAndamento],
    para: STATUS.aguardandoValidacao,
    motivo: 'nao',
  },
  validar: {
    rotulo: 'validar',
    papeis: ['cliente'],
    responsavel: 'cliente',
    de: [STATUS.aguardandoValidacao],
    para: STATUS.validada,
    motivo: 'nao',
  },
  rejeitar: {
    rotulo: 'rejeitar',
    papeis: ['cliente'],
    responsavel: 'cliente',
    de: [STATUS.aguardandoValidacao],
    para: STATUS.rejeitada,
    motivo: 'opcional', // F2 torna obrigatório
  },
  finalizar: {
    rotulo: 'finalizar',
    papeis: ['vistoriador'],
    responsavel: 'vistoriadorAtribuido',
    de: [STATUS.validada],
    para: STATUS.finalizada,
    motivo: 'nao',
  },
  cancelar: {
    rotulo: 'cancelar',
    papeis: ['admin'],
    responsavel: 'qualquer',
    de: [STATUS.aguardandoAgendamento, STATUS.agendada, STATUS.reagendada],
    para: STATUS.cancelada,
    motivo: 'obrigatorio',
  },
};

export const ACOES = Object.keys(TRANSICOES) as AcaoVistoria[];

export interface Ator {
  sub: number;
  papel: Papel;
}

export interface VistoriaEstado {
  status: string;
  idcliente: number | null;
  idvistoriador: number | null;
}

/** O ator é a pessoa certa para esta ação nesta vistoria (dono / atribuído / pool)? */
export function ehResponsavel(acao: AcaoVistoria, v: VistoriaEstado, ator: Ator): boolean {
  const regra = TRANSICOES[acao];
  switch (regra.responsavel) {
    case 'cliente':
      return Number(v.idcliente) === Number(ator.sub);
    case 'vistoriadorAtribuido':
      return Number(v.idvistoriador) === Number(ator.sub);
    case 'vistoriadorOuPool':
      return v.idvistoriador == null || Number(v.idvistoriador) === Number(ator.sub);
    case 'qualquer':
      return true;
  }
}

export type ResultadoVerificacao =
  | { ok: true; para: StatusVistoria }
  | { ok: false; erro: 'PAPEL' | 'RESPONSAVEL' | 'STATUS' };

/** Verifica papel, responsável e status de origem, nessa ordem. Não olha o banco. */
export function verificarTransicao(acao: AcaoVistoria, v: VistoriaEstado, ator: Ator): ResultadoVerificacao {
  const regra = TRANSICOES[acao];
  if (!regra.papeis.includes(ator.papel)) return { ok: false, erro: 'PAPEL' };
  if (!ehResponsavel(acao, v, ator)) return { ok: false, erro: 'RESPONSAVEL' };
  if (!(regra.de as readonly string[]).includes(v.status)) return { ok: false, erro: 'STATUS' };
  return { ok: true, para: regra.para };
}

/** Ações que o ator pode executar agora (para a tela mostrar só os botões válidos). */
export function acoesDisponiveis(v: VistoriaEstado, ator: Ator): AcaoVistoria[] {
  return ACOES.filter((a) => verificarTransicao(a, v, ator).ok);
}
