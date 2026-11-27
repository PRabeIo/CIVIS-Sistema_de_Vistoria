// F1: máquina de estados da vistoria. Única fonte das transições permitidas e de quem pode fazê-las.
// O serviço `transicao.service.ts` aplica a regra no banco (com trava de linha) e grava o evento (D5).
// F2: rejeição volta para revisão (até MAX_REVISOES) e depois para análise do admin.
// F3: reagendar é "Agendada → Agendada" com motivo. Atribuição pelo admin (F5) entra na mesma tabela.
import type { Papel } from './papel';

export const STATUS = {
  aguardandoAgendamento: 'Aguardando Agendamento da Vistoria',
  agendada: 'Vistoria Agendada',
  emAndamento: 'Em Andamento',
  aguardandoValidacao: 'Aguardando Validação',
  emRevisao: 'Em Revisão',
  emAnaliseAdmin: 'Em Análise do Admin',
  validada: 'Vistoria Validada',
  finalizada: 'Vistoria Finalizada',
  cancelada: 'Vistoria Cancelada',
} as const;

export type StatusVistoria = (typeof STATUS)[keyof typeof STATUS];

/** Mesma lista do CHECK `vistoria_status_chk` (migration 0008). */
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
  | 'cancelar'
  | 'pedirRevisao'
  | 'encerrar';

/** Ação registrada no histórico sem ser uma transição (criação da vistoria). */
export type AcaoEvento = AcaoVistoria | 'criar' | 'importar';

type Motivo = 'obrigatorio' | 'opcional' | 'nao';

/**
 * Quem, além do papel, pode agir:
 * - `cliente`: o dono da vistoria;
 * - `vistoriadorAtribuido`: o vistoriador da vistoria;
 * - `vistoriadorOuPool`: o vistoriador da vistoria ou qualquer um se ela estiver sem vistoriador;
 * - `participante`: o cliente dono, o vistoriador da vistoria ou um admin;
 * - `qualquer`: basta o papel (admin).
 */
type Responsavel = 'cliente' | 'vistoriadorAtribuido' | 'vistoriadorOuPool' | 'participante' | 'qualquer';

/** F2: quantas vezes o cliente pode rejeitar antes de a vistoria ir para o admin (env MAX_REVISOES, padrão 2). */
export function maxRevisoes(): number {
  const n = Number(process.env.MAX_REVISOES);
  return Number.isInteger(n) && n >= 0 ? n : 2;
}

interface RegraAcao {
  /** Verbo usado nas mensagens: "Não é possível {rotulo} uma vistoria ..." */
  rotulo: string;
  papeis: readonly Papel[];
  responsavel: Responsavel;
  de: readonly StatusVistoria[];
  /** Destino fixo ou calculado a partir da vistoria (ex.: rejeitar depende do número de revisões). */
  para: StatusVistoria | ((v: VistoriaEstado) => StatusVistoria);
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
  // F3: muda a data antes do início; o status continua "Agendada" (o evento registra o motivo).
  reagendar: {
    rotulo: 'reagendar',
    papeis: ['cliente', 'vistoriador', 'admin'],
    responsavel: 'participante',
    de: [STATUS.agendada],
    para: STATUS.agendada,
    motivo: 'obrigatorio',
  },
  iniciar: {
    rotulo: 'iniciar',
    papeis: ['vistoriador'],
    responsavel: 'vistoriadorOuPool',
    de: [STATUS.agendada],
    para: STATUS.emAndamento,
    motivo: 'nao',
  },
  gerarRelatorio: {
    rotulo: 'gerar o relatório de',
    papeis: ['vistoriador'],
    responsavel: 'vistoriadorAtribuido',
    de: [STATUS.emAndamento, STATUS.emRevisao],
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
  // F2: até MAX_REVISOES rejeições a vistoria volta para o vistoriador; a seguinte vai para o admin.
  rejeitar: {
    rotulo: 'rejeitar',
    papeis: ['cliente'],
    responsavel: 'cliente',
    de: [STATUS.aguardandoValidacao],
    para: (v) => ((v.revisoes ?? 0) < maxRevisoes() ? STATUS.emRevisao : STATUS.emAnaliseAdmin),
    motivo: 'obrigatorio',
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
    de: [STATUS.aguardandoAgendamento, STATUS.agendada, STATUS.emAnaliseAdmin],
    para: STATUS.cancelada,
    motivo: 'obrigatorio',
  },
  // F2: decisões do admin depois de esgotadas as revisões
  pedirRevisao: {
    rotulo: 'pedir nova revisão de',
    papeis: ['admin'],
    responsavel: 'qualquer',
    de: [STATUS.emAnaliseAdmin],
    para: STATUS.emRevisao,
    motivo: 'obrigatorio',
  },
  encerrar: {
    rotulo: 'encerrar',
    papeis: ['admin'],
    responsavel: 'qualquer',
    de: [STATUS.emAnaliseAdmin],
    para: STATUS.finalizada,
    motivo: 'obrigatorio', // parecer do admin
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
  revisoes?: number;
}

/** Destino da ação para esta vistoria. */
export function destino(acao: AcaoVistoria, v: VistoriaEstado): StatusVistoria {
  const para = TRANSICOES[acao].para;
  return typeof para === 'function' ? para(v) : para;
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
    case 'participante':
      if (ator.papel === 'admin') return true;
      if (ator.papel === 'cliente') return Number(v.idcliente) === Number(ator.sub);
      return Number(v.idvistoriador) === Number(ator.sub);
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
  return { ok: true, para: destino(acao, v) };
}

/** Ações que o ator pode executar agora (para a tela mostrar só os botões válidos). */
export function acoesDisponiveis(v: VistoriaEstado, ator: Ator): AcaoVistoria[] {
  return ACOES.filter((a) => verificarTransicao(a, v, ator).ok);
}
