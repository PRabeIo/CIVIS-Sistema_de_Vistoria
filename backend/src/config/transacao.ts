import type postgres from 'postgres';
import db from './db';

/** Conexão ou transação: aceita tanto `db` quanto o `tx` de `emTransacao`. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type Executor = postgres.Sql<{}>;

/**
 * `db.begin` tipado. Os tipos do postgres.js declaram `TransactionSql` com `Omit<Sql, ...>`,
 * o que apaga a assinatura de chamada (`tx\`...\``) no TypeScript; em tempo de execução o `tx`
 * é chamável normalmente. O cast fica concentrado aqui.
 */
export function emTransacao<T>(fn: (tx: Executor) => Promise<T>): Promise<T> {
  return db.begin((tx) => fn(tx as unknown as Executor)) as Promise<T>;
}
