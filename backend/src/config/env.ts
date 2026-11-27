// S10: valida as variáveis de ambiente na inicialização. O servidor não sobe com env incompleto
// e diz exatamente qual variável falta ou está errada. Os módulos continuam lendo `process.env`;
// esta checagem garante que o que eles leem é válido.
import { z } from 'zod';

const obrigatoria = 'é obrigatória';
const inteiro = (min: number, max: number) =>
  z.coerce
    .number({ error: 'deve ser um número' })
    .int({ error: 'deve ser um número inteiro' })
    .min(min, { error: `deve ser no mínimo ${min}` })
    .max(max, { error: `deve ser no máximo ${max}` })
    .optional();
const booleano = z.enum(['true', 'false'], { error: 'use true ou false' }).optional();

const schema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'], { error: 'use development, test ou production' })
      .default('development'),
    PORT: inteiro(1, 65535),

    DATABASE_URL: z
      .string({ error: obrigatoria })
      .regex(/^postgres(ql)?:\/\/.+/, { error: 'deve ser uma connection string postgres://...' }),
    DATABASE_SSL: z.enum(['require', 'disable'], { error: 'use require ou disable' }).optional(),

    JWT_SECRET: z.string({ error: obrigatoria }).min(32, { error: 'precisa ter pelo menos 32 caracteres' }),
    SESSAO_ACCESS_MIN: inteiro(1, 60),
    SESSAO_REFRESH_DIAS: inteiro(1, 90),
    BCRYPT_SALT_ROUNDS: inteiro(4, 15),

    CORS_ORIGIN: z.string().optional(),
    COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none'], { error: 'use strict, lax ou none' }).optional(),
    COOKIE_SECURE: booleano,
    TRUST_PROXY: booleano,

    RATE_LIMIT_LOGIN_MAX: inteiro(1, 10_000),
    RATE_LIMIT_CADASTRO_MAX: inteiro(1, 10_000),
    RATE_LIMIT_REFRESH_MAX: inteiro(1, 10_000),

    // F2: rejeições do cliente antes de a vistoria ir para a análise do admin
    MAX_REVISOES: inteiro(0, 10),

    STORAGE_DRIVER: z.enum(['local', 'supabase'], { error: 'use local ou supabase' }).default('local'),
    SUPABASE_URL: z.url({ error: 'deve ser uma URL (https://seu-projeto.supabase.co)' }).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    SUPABASE_BUCKET_RELATORIOS: z.string().optional(),

    GEMINI_API_KEY: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    const falta = (campo: string, motivo: string) =>
      ctx.addIssue({ code: 'custom', path: [campo], message: motivo });

    if (env.STORAGE_DRIVER === 'supabase') {
      if (!env.SUPABASE_URL) falta('SUPABASE_URL', 'é obrigatória com STORAGE_DRIVER=supabase');
      if (!env.SUPABASE_SERVICE_ROLE_KEY)
        falta('SUPABASE_SERVICE_ROLE_KEY', 'é obrigatória com STORAGE_DRIVER=supabase');
    }

    const producao = env.NODE_ENV === 'production';
    if (producao && !env.CORS_ORIGIN)
      falta('CORS_ORIGIN', 'é obrigatória em produção (endereço do frontend)');
    if (producao && env.COOKIE_SECURE === 'false') falta('COOKIE_SECURE', 'não pode ser false em produção');
    if (env.COOKIE_SAMESITE === 'none' && !producao && env.COOKIE_SECURE !== 'true') {
      falta('COOKIE_SECURE', 'precisa ser true com COOKIE_SAMESITE=none');
    }
  });

export type Env = z.infer<typeof schema>;

export type ResultadoEnv = { ok: true; env: Env; avisos: string[] } | { ok: false; erros: string[] };

/** Variáveis vazias (`X=`) contam como ausentes. */
function semVazias(fonte: NodeJS.ProcessEnv): Record<string, string> {
  const r: Record<string, string> = {};
  for (const [k, v] of Object.entries(fonte)) if (v !== undefined && v.trim() !== '') r[k] = v;
  return r;
}

export function validarEnv(fonte: NodeJS.ProcessEnv = process.env): ResultadoEnv {
  const r = schema.safeParse(semVazias(fonte));
  if (!r.success) {
    return { ok: false, erros: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
  }

  const env = r.data;
  const avisos: string[] = [];
  if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY === 'SUA_CHAVE_AQUI') {
    avisos.push('GEMINI_API_KEY não definida: os relatórios serão gerados sem IA (modo simplificado).');
  }
  if (env.NODE_ENV === 'production' && env.STORAGE_DRIVER === 'local') {
    avisos.push('STORAGE_DRIVER=local em produção: os relatórios ficam no disco do servidor (use supabase).');
  }
  return { ok: true, env, avisos };
}

/** Valida e encerra o processo com a lista de problemas se algo estiver errado. */
export function carregarEnv(fonte: NodeJS.ProcessEnv = process.env): Env {
  const r = validarEnv(fonte);
  if (!r.ok) {
    console.error(
      'Configuração inválida: corrija as variáveis abaixo (veja backend/example.env).\n' +
        r.erros.map((e) => `  - ${e}`).join('\n'),
    );
    process.exit(1);
  }
  for (const a of r.avisos) console.warn(`[env] ${a}`);
  return r.env;
}
