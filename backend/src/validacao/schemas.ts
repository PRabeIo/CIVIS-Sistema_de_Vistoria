// S9: schemas de entrada por rota. Os controllers chamam `validar(schema, req.body | req.params | req.query)`.
import { z } from 'zod';
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

export const clienteCadastro = z.object({ ...dadosPessoais, senha });

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

export const STATUS_VISTORIA = [
  'Aguardando Agendamento da Vistoria',
  'Vistoria Agendada',
  'Em Andamento',
  'Aguardando Validação',
  'Vistoria Reagendada',
  'Vistoria Finalizada',
  'Vistoria Validada',
  'Vistoria Rejeitada',
] as const;

export const agendamento = z.object({
  dataagendada: z
    .string({ error: 'Data e hora são obrigatórias.' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Data inválida. Use AAAA-MM-DD.' }),
  horaagendada: z
    .string({ error: 'Data e hora são obrigatórias.' })
    .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, { error: 'Hora inválida. Use HH:mm.' }),
});

const dataHora = z.iso.datetime({ offset: true, error: 'Data/hora inválida (use ISO 8601).' });

export const vistoriaAtualizacaoAdmin = z.object({
  dataagendada: opcional(dataHora),
  datahorainicio: opcional(dataHora),
  datahorafim: opcional(dataHora),
  condicoesclimaticas: opcional(z.string().trim().max(100)),
  imprevistos: opcional(z.string().max(5000)),
  observacoes: opcional(z.string().max(5000)),
  observacoesgerais: opcional(z.string().max(5000)),
  status: opcional(z.enum(STATUS_VISTORIA, { error: 'Status inválido.' })),
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

export const relatorioGeracao = z.object({
  idVistoria: id('Vistoria'),
  comodos: z
    .string()
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
    }),
});
