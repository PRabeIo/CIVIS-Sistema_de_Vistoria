// S9: schemas de entrada por rota. Os controllers chamam `validar(schema, req.body | req.params | req.query)`.
import { z } from 'zod';
import { OBSERVACAO_MAX } from '../domain/textoIA';
import { cpf, email, id, opcional, senha, telefone, texto } from './comum';

// ---------- Auth / usuários ----------

export const login = z.object({
  email: z.string({ error: 'Email e senha são obrigatórios.' }).trim().toLowerCase().min(1, { error: 'Email e senha são obrigatórios.' }),
  senha: z.string({ error: 'Email e senha são obrigatórios.' }).min(1, { error: 'Email e senha são obrigatórios.' }),
});

export const trocaSenha = z.object({
  senhaAtual: z.string({ error: 'Informe a senha atual.' }).min(1, { error: 'Informe a senha atual.' }),
  senhaNova: senha,
});

export const confirmacaoExclusao = z.object({
  confirmacao: z
    .string({ error: 'Digite "SIM" para confirmar a exclusão.' })
    .refine((v) => v.trim().toUpperCase() === 'SIM', { error: 'Digite "SIM" para confirmar a exclusão.' }),
});

const dadosPessoais = {
  nome: texto('Nome', 100),
  cpf,
  email,
  telefone: opcional(telefone),
};

/** Admin cadastra cliente (sem aceite: a base legal é o contrato com a construtora). */
export const clienteCriacaoAdmin = z.object({ ...dadosPessoais, senha });

/** S11: o cadastro público exige aceitar os termos de uso e a política de privacidade. */
export const clienteCadastro = clienteCriacaoAdmin.extend({
  aceiteTermos: z.literal(true, { error: 'É preciso aceitar os termos de uso e a política de privacidade.' }),
});

/** S11: exclusão da própria conta exige a senha e a confirmação digitada. */
export const exclusaoPropriaConta = z.object({
  senha: z.string({ error: 'Informe sua senha.' }).min(1, { error: 'Informe sua senha.' }),
  confirmacao: z
    .string({ error: 'Digite "EXCLUIR" para confirmar.' })
    .refine((v) => v.trim().toUpperCase() === 'EXCLUIR', { error: 'Digite "EXCLUIR" para confirmar.' }),
});

/** Edição de dados pessoais (admin ou o próprio cliente): tudo opcional. */
export const clienteAtualizacao = z.object({
  nome: opcional(texto('Nome', 100)),
  cpf: opcional(cpf),
  email: opcional(email),
  telefone: opcional(telefone),
});

/** Admin edita cliente com foto: pode também redefinir a senha. */
export const clienteAtualizacaoAdmin = clienteAtualizacao.extend({ senha: opcional(senha) });

const cargo = z.enum(['Administrador', 'Vistoriador'], { error: 'Cargo inválido. Use Administrador ou Vistoriador.' });

export const funcionarioCriacao = z.object({ ...dadosPessoais, senha, cargo });

export const funcionarioAtualizacao = z.object({
  nome: opcional(texto('Nome', 100)),
  cpf: opcional(cpf),
  email: opcional(email),
  telefone: opcional(telefone),
  senha: opcional(senha),
  cargo: opcional(cargo),
});

export const meuPerfilAtualizacao = clienteAtualizacao;

// ---------- Vistoria ----------

export const agendamento = z.object({
  dataagendada: z
    .string({ error: 'Data e hora são obrigatórias.' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Data inválida. Use AAAA-MM-DD.' }),
  horaagendada: z
    .string({ error: 'Data e hora são obrigatórias.' })
    .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, { error: 'Hora inválida. Use HH:mm.' }),
});

const dataHora = z.iso.datetime({ offset: true, error: 'Data/hora inválida (use ISO 8601).' });

const motivo = z.string({ error: 'Motivo inválido.' }).trim().max(1000, { error: 'O motivo deve ter no máximo 1000 caracteres.' });

/** F1: ações com motivo (opcional ou obrigatório conforme a máquina de estados). */
export const acaoComMotivo = z.object({ motivo: opcional(motivo) });

/** F2: admin pede nova revisão (motivo) e pode trocar o vistoriador. */
export const pedidoRevisao = z.object({ motivo: opcional(motivo), idvistoriador: opcional(id('Vistoriador')) });

/** Reagendar: nova data/hora e motivo. */
export const reagendamento = agendamento.extend({ motivo: opcional(motivo) });

/** F1: admin corrige dados; o status só muda pelas ações (agendar, iniciar, cancelar...). */
export const vistoriaAtualizacaoAdmin = z.object({
  status: z
    .undefined({ error: 'O status não pode ser alterado diretamente. Use as ações da vistoria (ex.: cancelar).' })
    .optional(),
  dataagendada: opcional(dataHora),
  datahorainicio: opcional(dataHora),
  datahorafim: opcional(dataHora),
  condicoesclimaticas: opcional(z.string().trim().max(100)),
  imprevistos: opcional(z.string().max(5000)),
  observacoes: opcional(z.string().max(5000)),
  observacoesgerais: opcional(z.string().max(5000)),
});

// ---------- Imóvel ----------

export const imovelCriacao = z.object({
  descricao: texto('Descrição', 500),
  bloco: opcional(z.string().trim().max(50)),
  numero: texto('Número', 20),
  idcliente: id('Cliente'),
  idempreendimento: id('Empreendimento'),
});

export const imovelAtualizacao = z.object({
  descricao: opcional(texto('Descrição', 500)),
  bloco: opcional(z.string().trim().max(50)),
  numero: opcional(texto('Número', 20)),
  idempreendimento: opcional(id('Empreendimento')),
  vistoriasrealizadas: opcional(z.coerce.number().int().min(0, { error: 'Quantidade inválida.' })),
});

export const queryEmpreendimento = z.object({ empreendimentoid: id('Empreendimento') });

// ---------- Empreendimento ----------

const cep = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => v.length === 8, { error: 'CEP inválido.' });

export const empreendimentoCriacao = z.object({
  nome: texto('Nome', 100),
  construtora: opcional(z.string().trim().max(100)),
  estado: opcional(z.string().trim().max(50)),
  cidade: opcional(z.string().trim().max(100)),
  cep: opcional(cep),
  rua: opcional(z.string().trim().max(150)),
});

export const empreendimentoAtualizacao = empreendimentoCriacao.partial().extend({
  nome: opcional(texto('Nome', 100)),
});

// ---------- Relatório ----------

export const ESTADOS_ITEM = ['Péssimo', 'Ruim', 'Razoável', 'Bom', 'Excelente'] as const;
export const COMODOS_RELATORIO = ['quartos', 'banheiros', 'sala', 'cozinha', 'varanda'] as const;

const estadoItem = z
  .union([z.enum(ESTADOS_ITEM), z.literal(''), z.null()], { error: 'Estado inválido. Use Péssimo, Ruim, Razoável, Bom ou Excelente.' })
  .optional();

/** S12: cada cômodo do formulário; o texto livre tem limite de tamanho antes de ir para a IA. */
const comodoRelatorio = z.object({
  Quantidade: z.coerce
    .number({ error: 'Quantidade inválida.' })
    .int({ error: 'Quantidade inválida.' })
    .min(0, { error: 'Quantidade inválida.' })
    .max(50, { error: 'Quantidade inválida.' })
    .transform(String)
    .default('0'),
  Estrutura: estadoItem,
  Pintura: estadoItem,
  InstalacaoEletrica: estadoItem,
  InstalacaoHidraulica: estadoItem,
  Piso: estadoItem,
  Telhado: estadoItem,
  observacoes: z
    .string({ error: 'Observações inválidas.' })
    .max(OBSERVACAO_MAX, { error: `As observações de cada cômodo devem ter no máximo ${OBSERVACAO_MAX} caracteres.` })
    .nullish(),
});

const comodosRelatorio = z.strictObject(
  Object.fromEntries(COMODOS_RELATORIO.map((c) => [c, comodoRelatorio.optional()])) as Record<
    (typeof COMODOS_RELATORIO)[number],
    z.ZodOptional<typeof comodoRelatorio>
  >,
  { error: 'Cômodo inválido.' },
);

export const relatorioGeracao = z.object({
  idVistoria: id('Vistoria'),
  comodos: z
    .string()
    .max(100_000, { error: 'Dados do relatório muito grandes.' })
    .default('{}')
    .transform((v, ctx) => {
      try {
        const obj = JSON.parse(v);
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj as Record<string, unknown>;
      } catch {
        // cai no erro abaixo
      }
      ctx.addIssue({ code: 'custom', message: "Campo 'comodos' não é um JSON válido." });
      return z.NEVER;
    })
    .pipe(comodosRelatorio),
});
