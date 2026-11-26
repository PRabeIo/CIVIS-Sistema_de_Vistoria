// S2: armazenamento PRIVADO de arquivos (relatórios). Nada aqui é servido publicamente.
//
// STORAGE_DRIVER:
//  - "local" (padrão em dev/teste): grava em backend/storage/, entregue só pela API com checagem de acesso.
//  - "supabase" (produção): bucket privado no Supabase Storage; o acesso é por URL assinada de curta duração.
import fs from 'fs';
import path from 'path';

export const STORAGE_LOCAL_DIR = path.join(__dirname, '..', '..', 'storage');
export const URL_ASSINADA_SEG = 10 * 60;

export type AcessoArquivo = { tipo: 'arquivo'; caminho: string } | { tipo: 'url'; url: string };

type Driver = 'local' | 'supabase';

function driver(): Driver {
  return process.env.STORAGE_DRIVER === 'supabase' ? 'supabase' : 'local';
}

/** Chaves são geradas pelo backend (UUID); mesmo assim, nada de "..", barras invertidas ou caminho absoluto. */
function validarChave(chave: string): string {
  if (!/^[\w-]+(\/[\w.-]+)*$/.test(chave) || chave.includes('..')) {
    throw new Error(`Chave de storage inválida: ${chave}`);
  }
  return chave;
}

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_BUCKET_RELATORIOS || 'relatorios';
  if (!url || !key) throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias com STORAGE_DRIVER=supabase.');
  return { url: url.replace(/\/$/, ''), key, bucket, headers: { Authorization: `Bearer ${key}`, apikey: key } };
}

export async function salvar(chave: string, conteudo: Buffer, contentType: string): Promise<void> {
  validarChave(chave);

  if (driver() === 'local') {
    const destino = path.join(STORAGE_LOCAL_DIR, chave);
    await fs.promises.mkdir(path.dirname(destino), { recursive: true });
    await fs.promises.writeFile(destino, conteudo, { flag: 'wx' }); // nunca sobrescreve
    return;
  }

  const s = supabase();
  const res = await fetch(`${s.url}/storage/v1/object/${s.bucket}/${chave}`, {
    method: 'POST',
    headers: { ...s.headers, 'Content-Type': contentType, 'x-upsert': 'false' },
    body: new Uint8Array(conteudo),
  });
  if (!res.ok) {
    // não inclui o corpo no erro (pode ecoar dados); o handler central loga e responde 500 genérico
    throw new Error(`Falha ao enviar arquivo ao storage (HTTP ${res.status}).`);
  }
}

/** Como entregar o arquivo: caminho local (a API envia) ou URL assinada (o navegador baixa direto). */
export async function acesso(chave: string): Promise<AcessoArquivo | null> {
  validarChave(chave);

  if (driver() === 'local') {
    const caminho = path.join(STORAGE_LOCAL_DIR, chave);
    return fs.existsSync(caminho) ? { tipo: 'arquivo', caminho } : null;
  }

  const s = supabase();
  const res = await fetch(`${s.url}/storage/v1/object/sign/${s.bucket}/${chave}`, {
    method: 'POST',
    headers: { ...s.headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: URL_ASSINADA_SEG }),
  });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`Falha ao assinar URL no storage (HTTP ${res.status}).`);
  const { signedURL } = (await res.json()) as { signedURL: string };
  return { tipo: 'url', url: `${s.url}/storage/v1${signedURL}` };
}
