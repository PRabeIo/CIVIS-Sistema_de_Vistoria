import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../Clientes/Clientes.css"; // mesmo layout de tabela das outras listagens do admin
import Navbar from "../../../components/Navbar/Navbar";
import { apiFetch } from "../../../../services/api";

// B7: antes lia um ":id" de uma rota sem parâmetro e sempre falhava.
// Agora é a listagem de vistorias do admin (GET /vistorias), com filtro por status.
// A listagem completa com busca e paginação fica para a Fase 3 (U6).

const formatarData = (v) =>
  v ? new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "-";

function unidade(v) {
  return [v.descricao, v.bloco && `Bloco ${v.bloco}`, v.numero && `nº ${v.numero}`].filter(Boolean).join(" · ") || "-";
}

function VistoriasAgendadas() {
  const navigate = useNavigate();
  const location = useLocation();
  const [vistorias, setVistorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(location.state?.status ?? ""); // a Home pode abrir já filtrada

  useEffect(() => {
    apiFetch("/vistorias")
      .then((data) => setVistorias(Array.isArray(data) ? data : []))
      .catch((err) => alert(err.message || "Não foi possível carregar as vistorias."))
      .finally(() => setLoading(false));
  }, []);

  const statusDisponiveis = useMemo(() => [...new Set(vistorias.map((v) => v.status))].sort(), [vistorias]);
  const filtradas = status ? vistorias.filter((v) => v.status === status) : vistorias;

  return (
    <div className="home-container clientes-page">
      <Navbar />

      <main className="admin-page-container">
        <div className="admin-header">
          <h1 className="titulo-centralizado">Vistorias</h1>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por status">
            <option value="">Todos os status</option>
            {statusDisponiveis.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p>Carregando vistorias...</p>
        ) : filtradas.length === 0 ? (
          <p className="sem-registros">Nenhuma vistoria encontrada.</p>
        ) : (
          <div className="table-responsive">
            <table className="lista-tabela">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Imóvel</th>
                  <th>Status</th>
                  <th>Agendada para</th>
                  <th>Vistoriador</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((v) => (
                  <tr key={v.idvistoria}>
                    <td data-label="Cliente">{v.nomecliente || "-"}</td>
                    <td data-label="Imóvel">
                      {unidade(v)}
                      {v.nomeempreendimento ? <small style={{ display: "block" }}>{v.nomeempreendimento}</small> : null}
                    </td>
                    <td data-label="Status">{v.status}</td>
                    <td data-label="Agendada para">{formatarData(v.dataagendada)}</td>
                    <td data-label="Vistoriador">{v.nomevistoriador || "-"}</td>
                    <td className="acoes-botoes" data-label="">
                      <button className="btn-editar" onClick={() => navigate(`/vistoria-detalhes/${v.idvistoria}`)}>
                        Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default VistoriasAgendadas;
