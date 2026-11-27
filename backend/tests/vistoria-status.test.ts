// F1 (máquina de estados) e D5 (auditoria das transições).
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import sql from '../src/config/db.js';
import {
  ACOES,
  acoesDisponiveis,
  destino,
  STATUS,
  STATUS_VISTORIA,
  TRANSICOES,
  verificarTransicao,
  type AcaoVistoria,
  type Ator,
} from '../src/domain/vistoriaStatus';
import { USUARIOS_SEED } from '../scripts/seed';
import { cookieDe, loginComo, tokenDe } from './helpers/auth';
import { gerarCpf, gerarEmail } from './helpers/dados';

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

let admin: string;
let cliente: string;
let vistoriador: string;
let idAdmin: number;
let idCliente: number;
let idVistoriador: number;
let idEmpreendimento: number;

const amanha = () => new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().slice(0, 10);

/** Vistoria num status qualquer (INSERT direto: o gatilho só barra UPDATE de status). */
async function vistoriaEm(status: string, comVistoriador = false): Promise<number> {
  const [{ idimovel }] = await sql`
    INSERT INTO imovel (descricao, numero, idcliente, idempreendimento)
    VALUES ('Imóvel F1', '7', ${idCliente}, ${idEmpreendimento}) RETURNING idimovel`;
  const [{ idvistoria }] = await sql`
    INSERT INTO vistoria (idcliente, idimovel, idvistoriador, status)
    VALUES (${idCliente}, ${idimovel}, ${comVistoriador ? idVistoriador : null}, ${status}) RETURNING idvistoria`;
  return idvistoria;
}

const statusDe = async (id: number) => (await sql`SELECT status FROM vistoria WHERE idvistoria = ${id}`)[0].status;
const eventosDe = async (id: number) =>
  sql`SELECT acao, status_de, status_para, usuario_id, papel, motivo FROM vistoria_evento WHERE idvistoria = ${id} ORDER BY id`;

beforeAll(async () => {
  [admin, cliente, vistoriador] = await Promise.all([tokenDe('admin'), tokenDe('cliente'), tokenDe('vistoriador')]);
  [{ id: idAdmin }] = await sql`SELECT id FROM usuario WHERE email = ${USUARIOS_SEED.admin.email}`;
  [{ id: idCliente }] = await sql`SELECT id FROM usuario WHERE email = ${USUARIOS_SEED.cliente.email}`;
  [{ id: idVistoriador }] = await sql`SELECT id FROM usuario WHERE email = ${USUARIOS_SEED.vistoriador.email}`;
  [{ idempreendimento: idEmpreendimento }] = await sql`SELECT idempreendimento FROM empreendimento LIMIT 1`;
});
afterAll(async () => {
  await sql.end();
});

describe('F1: tabela de transições (unitário)', () => {
  const atores: Record<string, Ator> = {
    admin: { sub: 1, papel: 'admin' },
    cliente: { sub: 2, papel: 'cliente' },
    vistoriador: { sub: 3, papel: 'vistoriador' },
  };
  // vistoria do cliente 2, atribuída ao vistoriador 3
  const vistoria = (status: string) => ({ status, idcliente: 2, idvistoriador: 3 });

  // Cada ação × cada status × cada papel: só a combinação da tabela passa.
  for (const acao of ACOES) {
    const regra = TRANSICOES[acao];
    it(`${acao}: ${regra.de.join(' / ')} (${regra.papeis.join(', ')})`, () => {
      for (const status of STATUS_VISTORIA) {
        for (const [nome, ator] of Object.entries(atores)) {
          const r = verificarTransicao(acao, vistoria(status), ator);
          const esperado = regra.papeis.includes(ator.papel) && regra.de.includes(status);
          expect(r.ok, `${acao} por ${nome} em "${status}"`).toBe(esperado);
          if (r.ok) expect(r.para).toBe(destino(acao, vistoria(status)));
        }
      }
    });
  }

  it('cliente que não é o dono e vistoriador que não é o atribuído não passam', () => {
    const v = { status: STATUS.aguardandoValidacao, idcliente: 2, idvistoriador: 3 };
    expect(verificarTransicao('validar', v, { sub: 99, papel: 'cliente' })).toEqual({ ok: false, erro: 'RESPONSAVEL' });
    const validada = { ...v, status: STATUS.validada };
    expect(verificarTransicao('finalizar', validada, { sub: 99, papel: 'vistoriador' })).toEqual({
      ok: false,
      erro: 'RESPONSAVEL',
    });
  });

  it('iniciar: qualquer vistoriador assume vistoria sem vistoriador (pool)', () => {
    const pool = { status: STATUS.agendada, idcliente: 2, idvistoriador: null };
    expect(verificarTransicao('iniciar', pool, { sub: 99, papel: 'vistoriador' }).ok).toBe(true);
  });

  it('status finais não têm saída', () => {
    for (const status of [STATUS.finalizada, STATUS.cancelada]) {
      for (const ator of Object.values(atores)) {
        expect(acoesDisponiveis(vistoria(status), ator)).toEqual([]);
      }
    }
  });
});

describe('F1 + D5: fluxo completo pela API, com histórico', () => {
  it('criar → agendar → iniciar → relatório → validar → finalizar', async () => {
    const criado = await request(app)
      .post('/api/imoveis')
      .set(bearer(admin))
      .send({ descricao: 'Fluxo completo', numero: '42', idcliente: idCliente, idempreendimento: idEmpreendimento });
    expect(criado.status).toBe(201);
    const id: number = criado.body.vistoria.idvistoria;

    const passo = (acao: string, token: string, body: object = {}) =>
      request(app).put(`/api/vistorias/${id}/${acao}`).set(bearer(token)).send(body);

    // o detalhe diz o que cada um pode fazer agora
    expect((await request(app).get(`/api/vistorias/${id}`).set(bearer(cliente))).body.acoes).toEqual(['agendar']);
    expect((await request(app).get(`/api/vistorias/${id}`).set(bearer(admin))).body.acoes).toEqual(['cancelar']);

    expect((await passo('agendar', cliente, { dataagendada: amanha(), horaagendada: '10:00' })).status).toBe(200);

    const iniciou = await passo('iniciar', vistoriador);
    expect(iniciou.status).toBe(200);
    expect(iniciou.body).toMatchObject({ status: STATUS.emAndamento, idvistoriador: idVistoriador });
    // repetir o "iniciar" na própria vistoria não cria outro evento
    expect((await passo('iniciar', vistoriador)).status).toBe(200);

    const rel = await request(app)
      .post('/api/relatorio/gerar')
      .set(bearer(vistoriador))
      .field('idVistoria', String(id))
      .field('comodos', JSON.stringify({ sala: { Quantidade: '1', Estrutura: 'Bom' } }));
    expect(rel.status).toBe(200);
    expect(await statusDe(id)).toBe(STATUS.aguardandoValidacao);

    expect((await passo('validar', cliente)).status).toBe(200);
    const fim = await passo('finalizar', vistoriador);
    expect(fim.status).toBe(200);
    expect(fim.body.status).toBe(STATUS.finalizada);

    const ev = await request(app).get(`/api/vistorias/${id}/eventos`).set(bearer(cliente));
    expect(ev.status).toBe(200);
    expect(ev.body.map((e: { acao: string }) => e.acao)).toEqual([
      'criar',
      'agendar',
      'iniciar',
      'gerarRelatorio',
      'validar',
      'finalizar',
    ]);
    expect(ev.body[0]).toMatchObject({ status_de: null, status_para: STATUS.aguardandoAgendamento, papel: 'admin' });
    expect(ev.body[1]).toMatchObject({
      status_de: STATUS.aguardandoAgendamento,
      status_para: STATUS.agendada,
      papel: 'cliente',
      nome: 'Cliente Teste',
    });
    expect(ev.body[5]).toMatchObject({ status_para: STATUS.finalizada, papel: 'vistoriador' });
    const quem = await eventosDe(id);
    expect(quem.map((e) => e.usuario_id)).toEqual([idAdmin, idCliente, idVistoriador, idVistoriador, idCliente, idVistoriador]);
  });
});

describe('F1: transições recusadas', () => {
  it('ação fora de ordem → 409 TRANSICAO_INVALIDA e nada muda', async () => {
    const id = await vistoriaEm(STATUS.agendada);
    const res = await request(app).put(`/api/vistorias/${id}/validar`).set(bearer(cliente));
    expect(res.status).toBe(409);
    expect(res.body.erro).toMatchObject({ codigo: 'TRANSICAO_INVALIDA', mensagem: expect.stringContaining('Vistoria Agendada') });
    expect(await statusDe(id)).toBe(STATUS.agendada);
    expect(await eventosDe(id)).toHaveLength(0);
  });

  it('cliente que não é o dono → 404 (não revela a vistoria)', async () => {
    const outro = { nome: 'Outro F1', cpf: gerarCpf(), email: gerarEmail('f1'), senha: 'senhaForte1', aceiteTermos: true };
    await request(app).post('/api/clientes/cadastro').send(outro);
    const token = cookieDe(await loginComo(outro.email, outro.senha), 'civis_at') as string;
    const id = await vistoriaEm(STATUS.aguardandoValidacao, true);
    expect((await request(app).put(`/api/vistorias/${id}/validar`).set(bearer(token))).status).toBe(404);
    expect((await request(app).get(`/api/vistorias/${id}/eventos`).set(bearer(token))).status).toBe(404);
  });

  it('relatório de vistoria que não está em andamento → 409 (antes de gerar o PDF)', async () => {
    const id = await vistoriaEm(STATUS.validada, true);
    const res = await request(app)
      .post('/api/relatorio/gerar')
      .set(bearer(vistoriador))
      .field('idVistoria', String(id))
      .field('comodos', JSON.stringify({ sala: { Quantidade: '1', Estrutura: 'Bom' } }));
    expect(res.status).toBe(409);
    expect(res.body.erro.codigo).toBe('TRANSICAO_INVALIDA');
  });

  it('admin não muda status pelo PUT genérico', async () => {
    const id = await vistoriaEm(STATUS.agendada);
    const res = await request(app)
      .put(`/api/vistorias/${id}`)
      .set(bearer(admin))
      .send({ status: STATUS.finalizada, observacoes: 'tentativa' });
    expect(res.status).toBe(400);
    expect(res.body.erro.mensagem).toMatch(/status não pode ser alterado diretamente/);
    expect(await statusDe(id)).toBe(STATUS.agendada);

    // os outros campos continuam editáveis
    const ok = await request(app).put(`/api/vistorias/${id}`).set(bearer(admin)).send({ observacoes: 'corrigido' });
    expect(ok.status).toBe(200);
  });

  it('o banco recusa UPDATE de status fora da máquina de estados', async () => {
    const id = await vistoriaEm(STATUS.agendada);
    await expect(sql`UPDATE vistoria SET status = ${STATUS.finalizada} WHERE idvistoria = ${id}`).rejects.toThrow(
      /fora da máquina de estados/,
    );
    // outras colunas continuam livres
    await sql`UPDATE vistoria SET observacoes = 'ok' WHERE idvistoria = ${id}`;
  });
});

describe('F1/F7: cancelamento pelo admin', () => {
  const cancelar = (id: number, body: object, token = admin) =>
    request(app).put(`/api/vistorias/${id}/cancelar`).set(bearer(token)).send(body);

  it('exige motivo', async () => {
    const id = await vistoriaEm(STATUS.agendada);
    const res = await cancelar(id, {});
    expect(res.status).toBe(400);
    expect(res.body.erro.campos.motivo).toBeDefined();
  });

  it('cancela vistoria agendada e registra o motivo', async () => {
    const id = await vistoriaEm(STATUS.agendada);
    const res = await cancelar(id, { motivo: 'Unidade devolvida à construtora' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe(STATUS.cancelada);
    expect(await eventosDe(id)).toEqual([
      {
        acao: 'cancelar',
        status_de: STATUS.agendada,
        status_para: STATUS.cancelada,
        usuario_id: idAdmin,
        papel: 'admin',
        motivo: 'Unidade devolvida à construtora',
      },
    ]);
  });

  it('não cancela vistoria em andamento (409) e só admin cancela (403)', async () => {
    const emAndamento = await vistoriaEm(STATUS.emAndamento, true);
    expect((await cancelar(emAndamento, { motivo: 'x' })).status).toBe(409);
    const agendada = await vistoriaEm(STATUS.agendada);
    expect((await cancelar(agendada, { motivo: 'x' }, cliente)).status).toBe(403);
  });
});

describe('F2: rejeição com revisões', () => {
  const rejeitar = (id: number, motivo?: string) =>
    request(app).put(`/api/vistorias/${id}/rejeitar`).set(bearer(cliente)).send(motivo ? { motivo } : {});
  const enviarRelatorio = (id: number) =>
    request(app)
      .post('/api/relatorio/gerar')
      .set(bearer(vistoriador))
      .field('idVistoria', String(id))
      .field('comodos', JSON.stringify({ sala: { Quantidade: '1', Estrutura: 'Bom' } }));

  it('motivo é obrigatório', async () => {
    const id = await vistoriaEm(STATUS.aguardandoValidacao, true);
    const res = await rejeitar(id);
    expect(res.status).toBe(400);
    expect(res.body.erro.campos.motivo).toBeDefined();
    expect(await statusDe(id)).toBe(STATUS.aguardandoValidacao);
  });

  it('2 revisões; a 3ª rejeição vai para o admin, que pede nova revisão trocando o vistoriador', async () => {
    const id = await vistoriaEm(STATUS.aguardandoValidacao, true);

    for (const n of [1, 2]) {
      const r = await rejeitar(id, `Problema ${n}`);
      expect(r.status).toBe(200);
      expect(r.body).toMatchObject({ status: STATUS.emRevisao, revisoes: n });

      // o vistoriador vê o motivo e reenvia o relatório
      const det = await request(app).get(`/api/vistorias/${id}`).set(bearer(vistoriador));
      expect(det.body).toMatchObject({ motivo_revisao: `Problema ${n}`, acoes: ['gerarRelatorio'] });
      expect((await enviarRelatorio(id)).status).toBe(200);
      expect(await statusDe(id)).toBe(STATUS.aguardandoValidacao);
    }

    const terceira = await rejeitar(id, 'Ainda errado');
    expect(terceira.body).toMatchObject({ status: STATUS.emAnaliseAdmin, revisoes: 3 });
    const doAdmin = await request(app).get(`/api/vistorias/${id}`).set(bearer(admin));
    expect(doAdmin.body.acoes).toEqual(['cancelar', 'pedirRevisao', 'encerrar']);

    // o vistoriador não pode mais reenviar enquanto o admin analisa
    expect((await enviarRelatorio(id)).status).toBe(409);

    // admin devolve para revisão com outro vistoriador
    const [{ id: outro }] = await sql`
      INSERT INTO usuario (email, senha_hash, papel) VALUES (${gerarEmail('vist')}, 'x', 'vistoriador') RETURNING id`;
    await sql`INSERT INTO funcionario (id, nome, cpf) VALUES (${outro}, 'Outro Vistoriador', ${gerarCpf()})`;
    const semMotivo = await request(app).put(`/api/vistorias/${id}/pedir-revisao`).set(bearer(admin)).send({});
    expect(semMotivo.status).toBe(400);
    const pedido = await request(app)
      .put(`/api/vistorias/${id}/pedir-revisao`)
      .set(bearer(admin))
      .send({ motivo: 'Refazer com outro profissional', idvistoriador: outro });
    expect(pedido.status).toBe(200);
    expect(pedido.body).toMatchObject({ status: STATUS.emRevisao, idvistoriador: outro });

    const acoes = (await eventosDe(id)).map((e) => e.acao);
    expect(acoes).toEqual(['rejeitar', 'gerarRelatorio', 'rejeitar', 'gerarRelatorio', 'rejeitar', 'pedirRevisao']);
  });

  it('pedir revisão com vistoriador inválido → 400', async () => {
    const id = await vistoriaEm(STATUS.emAnaliseAdmin, true);
    const res = await request(app)
      .put(`/api/vistorias/${id}/pedir-revisao`)
      .set(bearer(admin))
      .send({ motivo: 'x', idvistoriador: idCliente });
    expect(res.status).toBe(400);
  });

  it('admin encerra com parecer', async () => {
    const id = await vistoriaEm(STATUS.emAnaliseAdmin, true);
    expect((await request(app).put(`/api/vistorias/${id}/encerrar`).set(bearer(admin)).send({})).status).toBe(400);
    const res = await request(app)
      .put(`/api/vistorias/${id}/encerrar`)
      .set(bearer(admin))
      .send({ motivo: 'Relatório aceito pela construtora após análise' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe(STATUS.finalizada);
    expect(res.body.datahorafim).toBeTruthy();
  });

  it('MAX_REVISOES=0 manda a 1ª rejeição direto para o admin', async () => {
    const antes = process.env.MAX_REVISOES;
    process.env.MAX_REVISOES = '0';
    try {
      const id = await vistoriaEm(STATUS.aguardandoValidacao, true);
      expect((await rejeitar(id, 'x')).body.status).toBe(STATUS.emAnaliseAdmin);
    } finally {
      if (antes === undefined) delete process.env.MAX_REVISOES;
      else process.env.MAX_REVISOES = antes;
    }
  });
});

describe('F3: reagendamento', () => {
  const reagendar = (id: number, token: string, body: object) =>
    request(app).put(`/api/vistorias/${id}/reagendar`).set(bearer(token)).send(body);
  const dados = () => ({ dataagendada: amanha(), horaagendada: '15:30', motivo: 'Imprevisto' });

  it('cliente dono, vistoriador da vistoria e admin reagendam (motivo obrigatório)', async () => {
    const id = await vistoriaEm(STATUS.agendada, true);
    expect((await reagendar(id, cliente, { ...dados(), motivo: '' })).status).toBe(400);
    for (const token of [cliente, vistoriador, admin]) {
      const res = await reagendar(id, token, dados());
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(STATUS.agendada);
    }
    const [v] = await sql`SELECT dataagendada FROM vistoria WHERE idvistoria = ${id}`;
    expect(new Date(v.dataagendada).toISOString()).toBe(new Date(`${amanha()}T15:30:00-03:00`).toISOString());
    const ev = await eventosDe(id);
    expect(ev.map((e) => e.papel)).toEqual(['cliente', 'vistoriador', 'admin']);
    expect(ev[0]).toMatchObject({
      acao: 'reagendar',
      status_de: STATUS.agendada,
      status_para: STATUS.agendada,
      motivo: 'Imprevisto',
    });
  });

  it('data no passado → 400', async () => {
    const id = await vistoriaEm(STATUS.agendada, true);
    expect((await reagendar(id, cliente, { ...dados(), dataagendada: '2020-01-01' })).status).toBe(400);
  });

  it('depois do início ou aguardando validação → 409', async () => {
    for (const status of [STATUS.emAndamento, STATUS.aguardandoValidacao]) {
      const id = await vistoriaEm(status, true);
      expect((await reagendar(id, cliente, dados())).status).toBe(409);
    }
  });

  it('vistoriador que não é o da vistoria não reagenda (404)', async () => {
    const id = await vistoriaEm(STATUS.agendada, false);
    expect((await reagendar(id, vistoriador, dados())).status).toBe(404);
  });
});

describe('D5: histórico', () => {
  it('rejeição guarda o motivo informado', async () => {
    const id = await vistoriaEm(STATUS.aguardandoValidacao, true);
    const res = await request(app)
      .put(`/api/vistorias/${id}/rejeitar`)
      .set(bearer(cliente))
      .send({ motivo: 'Faltou a foto da varanda' });
    expect(res.status).toBe(200);
    const [e] = await eventosDe(id);
    expect(e).toMatchObject({ acao: 'rejeitar', motivo: 'Faltou a foto da varanda', papel: 'cliente' });
  });
});

// garante que a tabela cobre todas as ações (evita esquecer uma ao mexer no tipo)
const _todas: Record<AcaoVistoria, true> = {
  agendar: true,
  reagendar: true,
  iniciar: true,
  gerarRelatorio: true,
  validar: true,
  rejeitar: true,
  finalizar: true,
  cancelar: true,
  pedirRevisao: true,
  encerrar: true,
};
void _todas;
