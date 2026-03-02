import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../../services/api";
import Navbar from "../../components/Navbar/Navbar"; 
import "./ValidarVistoria.css";

function ValidarVistoria() {
  const navigate = useNavigate();

  const [vistoriaSelecionada, setVistoriaSelecionada] = useState("");
  const [relatorioUrl, setRelatorioUrl] = useState("");
  const [pendentes, setPendentes] = useState([]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/login");
  };

  useEffect(() => {
    const fetchPendentes = async () => {
      try {
        const data = await apiFetch("/vistorias/minhas/pendentes-validacao", {
          method: "GET",
        });
        setPendentes(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erro ao buscar pendentes de validação:", err);

        if (String(err.message).toLowerCase().includes("token")) {
          alert("Sessão expirada. Faça login novamente.");
          handleLogout();
          return;
        }

        alert(err.message || "Erro ao carregar imóveis pendentes.");
      }
    };

    fetchPendentes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectChange = (e) => {
    const id = e.target.value; // string do select
    if (!id) {
      setVistoriaSelecionada("");
      setRelatorioUrl("");
      return;
    }

    const item = pendentes.find((p) => String(p.idvistoria) === String(id));
    setVistoriaSelecionada(id);
    setRelatorioUrl(item?.relatorio_url || "");
  };

  const podeAcao = Boolean(vistoriaSelecionada);

  const handleValidar = async (e) => {
    e.preventDefault();
    if (!podeAcao) return;

    try {
      await apiFetch(`/vistorias/${vistoriaSelecionada}/validar`, {
        method: "PUT",
      });
      alert("Vistoria validada com sucesso!");
      navigate("/home-cliente");
    } catch (err) {
      alert(err.message || "Erro ao validar vistoria.");
    }
  };

  const handleRejeitar = async () => {
    if (!podeAcao) return;

    if (!window.confirm("Tem certeza que deseja rejeitar esta vistoria?")) return;

    try {
      await apiFetch(`/vistorias/${vistoriaSelecionada}/rejeitar`, {
        method: "PUT",
      });
      alert("Vistoria rejeitada com sucesso!");
      navigate("/home-cliente");
    } catch (err) {
      alert(err.message || "Erro ao rejeitar vistoria.");
    }
  };

  return (
    <div className="home-container validar-vistoria-page">
      {/* Navbar reutilizável */}
      <Navbar onLogout={handleLogout} />

      <main className="admin-page-container">
        <div className="page-header">
          <h1 className="titulo-centralizado">Validar Vistoria</h1>
        </div>

        <form onSubmit={handleValidar} className="form-card">
          <div className="form-group">
            <label htmlFor="vistoria">Selecione a Vistoria:</label>
            <select
              id="vistoria"
              value={vistoriaSelecionada}
              onChange={handleSelectChange}
              required
            >
              <option value="">-- Selecione uma vistoria --</option>

              {pendentes.map((p) => (
                <option key={p.idvistoria} value={p.idvistoria}>
                  {p.nomeempreendimento
                    ? `${p.nomeempreendimento} - Bloco ${p.bloco ?? ""}, Nº ${
                        p.numero ?? ""
                      }`
                    : `Vistoria #${p.idvistoria}`}
                </option>
              ))}
            </select>
          </div>

          {relatorioUrl ? (
            <div className="pdf-row">
              <a
                href={relatorioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`btn btn-pdf ${!podeAcao ? "is-disabled" : ""}`}
                aria-disabled={!podeAcao}
                onClick={(e) => {
                  if (!podeAcao) e.preventDefault();
                }}
              >
                Visualizar Relatório
              </a>
            </div>
          ) : null}

          <div className="actions">
            <button type="submit" className="btn btn-primary" disabled={!podeAcao}>
              Validar Vistoria
            </button>

            <button
              type="button"
              className="btn btn-danger"
              onClick={handleRejeitar}
              disabled={!podeAcao}
            >
              Rejeitar Vistoria
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate("/home-cliente")}
            >
              Voltar
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default ValidarVistoria;