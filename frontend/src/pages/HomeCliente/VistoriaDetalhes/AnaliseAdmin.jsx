import { useEffect, useState } from "react";
import { apiFetch } from "../../../services/api";

// F2: depois de esgotadas as revisões, o admin decide: devolver para revisão (podendo trocar o
// vistoriador), encerrar com parecer ou cancelar (botão "Cancelar vistoria" da tela).
export default function AnaliseAdmin({ vistoria, aoConcluir }) {
  const [parecer, setParecer] = useState("");
  const [vistoriadores, setVistoriadores] = useState([]);
  const [idvistoriador, setIdvistoriador] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    apiFetch("/funcionarios")
      .then((lista) => setVistoriadores(Array.isArray(lista) ? lista.filter((f) => f.cargo === "Vistoriador" && f.ativo) : []))
      .catch(() => setVistoriadores([]));
  }, []);

  const executar = async (acao, body, confirmacao) => {
    if (!parecer.trim()) {
      alert("Escreva o parecer (ele fica no histórico da vistoria).");
      return;
    }
    if (!window.confirm(confirmacao)) return;
    setEnviando(true);
    try {
      await apiFetch(`/vistorias/${vistoria.idvistoria}/${acao}`, { method: "PUT", body: JSON.stringify(body) });
      setParecer("");
      aoConcluir();
    } catch (err) {
      alert(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="analise-admin" aria-labelledby="analise-titulo">
      <h2 id="analise-titulo">Análise do administrador</h2>
      <p>
        O cliente rejeitou o relatório {vistoria.revisoes} vez(es).
        {vistoria.motivo_revisao ? (
          <>
            {" "}
            Último motivo: <em>{vistoria.motivo_revisao}</em>
          </>
        ) : null}
      </p>

      <label htmlFor="parecer">Parecer</label>
      <textarea
        id="parecer"
        rows={3}
        maxLength={1000}
        value={parecer}
        onChange={(e) => setParecer(e.target.value)}
        placeholder="Explique a decisão (fica no histórico e é visto pelo cliente)"
      />

      <label htmlFor="novo-vistoriador">Vistoriador da nova revisão</label>
      <select id="novo-vistoriador" value={idvistoriador} onChange={(e) => setIdvistoriador(e.target.value)}>
        <option value="">Manter {vistoria.nomevistoriador || "o atual"}</option>
        {vistoriadores
          .filter((f) => Number(f.id) !== Number(vistoria.idvistoriador))
          .map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
      </select>

      <div className="analise-acoes">
        <button
          type="button"
          className="btn btn--primary"
          disabled={enviando}
          onClick={() =>
            executar(
              "pedir-revisao",
              { motivo: parecer, idvistoriador: idvistoriador ? Number(idvistoriador) : undefined },
              "Devolver a vistoria para uma nova revisão do relatório?"
            )
          }
        >
          Devolver para revisão
        </button>
        <button
          type="button"
          className="btn btn--neutral"
          disabled={enviando}
          onClick={() => executar("encerrar", { motivo: parecer }, "Encerrar a vistoria com este parecer?")}
        >
          Encerrar com parecer
        </button>
      </div>
    </section>
  );
}
