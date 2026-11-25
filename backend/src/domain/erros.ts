/** Erro de regra de negócio com status HTTP (lido pelos controllers via `err.statusCode`). */
export class ErroHttp extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ErroHttp';
  }
}
