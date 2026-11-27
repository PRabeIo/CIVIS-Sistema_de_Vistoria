// S7: erro de aplicação com status HTTP e código estável (o frontend pode reagir ao código).
export type CodigoErro =
  | 'VALIDACAO'
  | 'JSON_INVALIDO'
  | 'NAO_AUTENTICADO'
  | 'PROIBIDO'
  | 'NAO_ENCONTRADO'
  | 'CONFLITO'
  | 'EMAIL_EM_USO'
  | 'CPF_EM_USO'
  | 'REFERENCIA_INVALIDA'
  | 'ARQUIVO_INVALIDO'
  | 'ARQUIVO_GRANDE'
  | 'SENHA_INCORRETA'
  | 'USUARIO_INATIVO'
  | 'MUITAS_TENTATIVAS'
  | 'REGRA_DE_NEGOCIO'
  | 'ULTIMO_ADMIN'
  | 'STORAGE_INDISPONIVEL'
  | 'IMOVEL_COM_HISTORICO'
  | 'VISTORIA_EM_ABERTO'
  | 'TRANSICAO_INVALIDA'
  | 'ACAO_SOBRE_SI_MESMO'
  | 'ERRO_INTERNO';

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: CodigoErro,
    mensagem: string,
    /** Erros por campo (validação). */
    public readonly campos?: Record<string, string>,
  ) {
    super(mensagem);
    this.name = 'AppError';
  }

  /** Compatibilidade com código legado que lê `err.statusCode`. */
  get statusCode(): number {
    return this.status;
  }
}

export const naoEncontrado = (mensagem: string) => new AppError(404, 'NAO_ENCONTRADO', mensagem);
export const requisicaoInvalida = (mensagem: string) => new AppError(400, 'REGRA_DE_NEGOCIO', mensagem);
