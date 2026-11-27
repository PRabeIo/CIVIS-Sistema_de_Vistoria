import { useEffect, useState } from "react";
import { apiFetch } from "../../../services/api";
import "./HistoricoVistoria.css";

// D5: linha do tempo da vistoria (GET /vistorias/:id/eventos). Mesma regra de acesso do detalhe.
const ROTULO_ACAO = {
  criar: "Vistoria criada",
  importar: "Situação registrada",
  agendar: "Vistoria agendada",
  reagendar: "Nova visita solicitada",
  iniciar: "Vistoria iniciada",
  gerarRelatorio: "Relatório enviado",
  validar: "Relatório validado",
  rejeitar: "Relatório rejeitado",
  finalizar: "Vistoria finalizada",
  cancelar: "Vistoria cancelada",
};

const ROTULO_PAPEL = { admin: "administrador", vistoriador: "vistoriador", cliente: "cliente" };

const formatar = (iso) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

function quem(e) {
  if (!e.papel) return "Sistema";
  const papel = ROTULO_PAPEL[e.papel] || e.papel;
  return e.nome ? `${e.nome} (${papel})` : papel;
}

/** `versao` muda quando a tela executa uma ação, para recarregar o histórico. */
export default function HistoricoVistoria({ idvistoria, versao = 0 }) {
  const [eventos, setEventos] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    apiFetch(`/vistorias/${idvistoria}/eventos`)
      .then((data) => ativo && setEventos(Array.isArray(data) ? data : []))
      .catch((err) => ativo && setErro(err.message || "Não foi possível carregar o histórico."));
    return () => {
      ativo = false;
    };
  }, [idvistoria, versao]);

  return (
    <section className="historico-vistoria" aria-labelledby="historico-titulo">
      <h2 id="historico-titulo">Histórico</h2>
      {erro ? (
        <p className="historico-vazio">{erro}</p>
      ) : eventos === null ? (
        <p className="historico-vazio">Carregando histórico...</p>
      ) : eventos.length === 0 ? (
        <p className="historico-vazio">Sem registros.</p>
      ) : (
        <ol className="historico-lista">
          {eventos.map((e) => (
            <li key={e.id} className="historico-item">
              <div className="historico-cabecalho">
                <strong>{ROTULO_ACAO[e.acao] || e.acao}</strong>
                <time dateTime={e.criado_em}>{formatar(e.criado_em)}</time>
              </div>
              <div className="historico-detalhe">
                {quem(e)} · {e.status_de ? `${e.status_de} → ` : ""}
                {e.status_para}
              </div>
              {e.motivo ? <div className="historico-motivo">Motivo: {e.motivo}</div> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
