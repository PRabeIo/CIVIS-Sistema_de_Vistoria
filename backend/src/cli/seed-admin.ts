/*
 * S8: cria o PRIMEIRO administrador (produção ou ambiente novo), lendo os dados do ambiente:
 *   ADMIN_NOME, ADMIN_EMAIL, ADMIN_CPF, ADMIN_SENHA (obrigatórios) e ADMIN_TELEFONE (opcional).
 *
 * Só age se ainda não existir nenhum admin: rodar de novo não muda nada.
 * Uso: npm run seed:admin (dev, via tsx) ou npm run seed:admin:prod (depois do build, via node).
 * Depois de criado, apague ADMIN_SENHA do ambiente e troque a senha pelo sistema.
 */
import 'dotenv/config';
import db from '../config/db';
import { AppError } from '../domain/erros';
import * as funcionarioService from '../services/funcionario.service';
import { validar } from '../validacao/comum';
import { funcionarioCriacao } from '../validacao/schemas';

export type ResultadoSeedAdmin =
  { criado: true; id: number; email: string } | { criado: false; motivo: 'JA_EXISTE_ADMIN' };

const OBRIGATORIAS = ['ADMIN_NOME', 'ADMIN_EMAIL', 'ADMIN_CPF', 'ADMIN_SENHA'] as const;

export async function seedAdmin(env: NodeJS.ProcessEnv = process.env): Promise<ResultadoSeedAdmin> {
  const faltando = OBRIGATORIAS.filter((k) => !env[k]?.trim());
  if (faltando.length) {
    throw new AppError(400, 'VALIDACAO', `Defina no ambiente: ${faltando.join(', ')}.`);
  }

  // Valida antes de olhar o banco: env errado é avisado mesmo quando já existe admin.
  const dados = validar(funcionarioCriacao, {
    nome: env.ADMIN_NOME,
    email: env.ADMIN_EMAIL,
    cpf: env.ADMIN_CPF,
    senha: env.ADMIN_SENHA,
    telefone: env.ADMIN_TELEFONE || undefined,
    cargo: 'Administrador',
  });

  const [existe] = await db`SELECT 1 FROM usuario WHERE papel = 'admin' LIMIT 1`;
  if (existe) return { criado: false, motivo: 'JA_EXISTE_ADMIN' };

  const admin = await funcionarioService.criar(dados);
  return { criado: true, id: admin.id, email: admin.email };
}

function descreverErro(err: unknown): string {
  if (err instanceof AppError) {
    const campos = err.campos
      ? Object.entries(err.campos)
          .map(([c, m]) => `\n  - ${c}: ${m}`)
          .join('')
      : '';
    return err.message + campos;
  }
  return err instanceof Error ? err.message : String(err);
}

if (require.main === module) {
  seedAdmin()
    .then((r) => {
      console.log(
        r.criado
          ? `Administrador criado: ${r.email} (id ${r.id}). Remova ADMIN_SENHA do ambiente.`
          : 'Já existe um administrador; nada foi alterado.',
      );
    })
    .catch((err: unknown) => {
      console.error('Falha ao criar o administrador:', descreverErro(err));
      process.exitCode = 1;
    })
    .finally(() => db.end());
}
