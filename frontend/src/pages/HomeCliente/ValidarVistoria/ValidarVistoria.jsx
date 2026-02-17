import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../../services/api"; // ajuste o caminho
import "./ValidarVistoria.css";

function ValidarVistoria() {
  const navigate = useNavigate();

  const [vistoriaSelecionada, setVistoriaSelecionada] = useState(null);
  const [relatorioUrl, setRelatorioUrl] = useState("");
  const [pendentes, setPendentes] = useState([]);

  useEffect(() => {
    const fetchPendentes = async () => {
      try {
        const data = await apiFetch("/vistorias/minhas/pendentes-validacao", { method: "GET" });
        setPendentes(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erro ao buscar pendentes de validação:", err);

        if (String(err.message).toLowerCase().includes("token")) {
          alert("Sessão expirada. Faça login novamente.");
          localStorage.removeItem("token");
          localStorage.removeItem("usuario");
          navigate("/login");
          return;
        }

        alert(err.message || "Erro ao carregar imóveis pendentes.");
      }
    };

    fetchPendentes();
  }, [navigate]);

  const handleSelectChange = (e) => {
    const idvistoria = Number(e.target.value);
    if (!idvistoria) {
      setVistoriaSelecionada(null);
      setRelatorioUrl("");
      return;
    }

    const item = pendentes.find((p) => Number(p.idvistoria) === idvistoria);

    setVistoriaSelecionada(idvistoria);
    setRelatorioUrl(item?.relatorio_url || "");
  };

  const handleValidar = async (e) => {
    e.preventDefault();

    if (!vistoriaSelecionada) {
      alert("Selecione uma vistoria válida.");
      return;
    }

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
    if (!vistoriaSelecionada) {
      alert("Selecione uma vistoria válida para rejeitar.");
      return;
    }

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
    <div className="home-container">
      <header className="navbar">
        <div className="logo">CIVIS</div>
        <nav className="nav-links">
          <a href="#" onClick={() => navigate("/home-cliente")}>Home</a>
          <a href="#" onClick={() => navigate("/validar-vistoria")}>Validar Vistoria</a>
        </nav>
        <button
          className="logout-button"
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("usuario");
            navigate("/login");
          }}
        >
          Sair
        </button>
      </header>

      <main
        className="main-content"
        style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
      >
        <button
          className="back-arrow"
          onClick={() => navigate("/home-cliente")}
          style={{ marginBottom: "20px", marginLeft: "20px" }}
        >
          &#8592; Voltar
        </button>

        <h1 className="titulo-centralizado">Validar Vistoria</h1>

        <form
          onSubmit={handleValidar}
          className="login-form"
          style={{
            width: "80%",
            maxWidth: "400px",
            padding: "30px",
            backgroundColor: "white",
            borderRadius: "10px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          }}
        >
          <label htmlFor="vistoria">Selecione a Vistoria:</label>

          <select
            id="vistoria"
            value={vistoriaSelecionada ?? ""}
            onChange={handleSelectChange}
            required
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "5px",
              marginBottom: "15px",
            }}
          >
            <option value="">-- Selecione uma vistoria --</option>

            {pendentes.map((p) => (
              <option key={p.idvistoria} value={p.idvistoria}>
                {p.nomeempreendimento
                  ? `${p.nomeempreendimento} - Bloco ${p.bloco ?? ""}, Nº ${p.numero ?? ""}`
                  : `Vistoria #${p.idvistoria}`}
              </option>
            ))}
          </select>

          {relatorioUrl && (
            <div style={{ marginBottom: "15px" }}>
              <a
                href={relatorioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="login-button"
                style={{
                  backgroundColor: "#007bff",
                  textDecoration: "none",
                  color: "white",
                  display: "inline-block",
                  padding: "10px 20px",
                  borderRadius: "5px",
                }}
              >
                Visualizar PDF
              </a>
            </div>
          )}

          {/* ✅ VALIDAR */}
          <button
            type="submit"
            className="login-button"
            style={{
              backgroundColor: "#189718",
              color: "white",
              border: "none",
              width: "100%",
            }}
            disabled={!vistoriaSelecionada}
          >
            Validar Vistoria
          </button>

          {/* ✅ SOLICITAR NOVA VISTORIA (abre outra página) */}
          <button
            type="button"
            className="login-button"
            onClick={() =>
              navigate("/reagendar-vistoria", { state: { idvistoria: vistoriaSelecionada } })
            }
            style={{
              marginTop: "10px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              width: "100%",
            }}
            disabled={!vistoriaSelecionada}
          >
            Solicitar Nova Vistoria
          </button>

          {/* ✅ REJEITAR */}
          <button
            type="button"
            className="login-button"
            onClick={handleRejeitar}
            style={{
              marginTop: "10px",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              width: "100%",
            }}
            disabled={!vistoriaSelecionada}
          >
            Rejeitar Vistoria
          </button>
        </form>
      </main>
    </div>
  );
}

export default ValidarVistoria;
