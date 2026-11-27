import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, logoutNoServidor } from "../../../services/api"; // ajuste o caminho se necessário
import "./SolicitarNovaVistoria.css";
import Navbar from "../../components/Navbar/Navbar";

function SolicitarNovaVistoria() {
  const navigate = useNavigate();

  const [vistoriaSelecionada, setVistoriaSelecionada] = useState("");
  const [dataDesejada, setDataDesejada] = useState("");
  const [horaDesejada, setHoraDesejada] = useState("");
  const [motivo, setMotivo] = useState("");
  const [vistoriasPendentes, setVistoriasPendentes] = useState([]);

  useEffect(() => {
    const fetchVistorias = async () => {
      try {
        // F3: só vistorias agendadas (antes do início) podem mudar de data
        const data = await apiFetch("/vistorias/minhas", { method: "GET" });
        setVistoriasPendentes(Array.isArray(data) ? data.filter((v) => v.status === "Vistoria Agendada") : []);
      } catch (err) {
        console.error("Erro ao carregar vistorias agendadas:", err);

        if (String(err.message).toLowerCase().includes("token")) {
          alert("Sessão expirada. Faça login novamente.");
          logoutNoServidor();
          localStorage.removeItem("usuario");
          navigate("/login");
          return;
        }

        alert(err.message || "Erro ao carregar vistorias.");
      }
    };

    fetchVistorias();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!vistoriaSelecionada || !dataDesejada || !horaDesejada || !motivo.trim()) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    try {
      // ✅ rota nova: PUT /vistorias/:idvistoria/reagendar
      await apiFetch(`/vistorias/${vistoriaSelecionada}/reagendar`, {
        method: "PUT",
        body: JSON.stringify({
          dataagendada: dataDesejada,
          horaagendada: horaDesejada,
          motivo,
        }),
      });

      alert("Vistoria reagendada com sucesso!");
      navigate("/home");
    } catch (err) {
      alert(err.message || "Erro ao reagendar vistoria.");
    }
  };

  return (
    <div className="home-container">
      <Navbar />

      <main className="main-content" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <button
          className="back-arrow"
          onClick={() => navigate("/home")}
          style={{ marginBottom: "20px", marginLeft: "20px", alignSelf: "flex-start" }}
        >
          &#8592; Voltar
        </button>

        <h1 className="titulo-centralizado">Reagendar Vistoria</h1>

        <form
          onSubmit={handleSubmit}
          className="login-form"
          style={{
            width: "90%",
            maxWidth: "400px",
            margin: "0 auto",
            padding: "30px",
            backgroundColor: "white",
            borderRadius: "10px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          }}
        >
          <p style={{ marginTop: 0 }}>
            {vistoriasPendentes.length === 0
              ? "Nenhuma vistoria agendada. Só é possível mudar a data antes de a vistoria começar."
              : "Escolha a vistoria, a nova data e o motivo da mudança."}
          </p>

          <label htmlFor="vistoria">Selecione a Vistoria:</label>

          <select
            id="vistoria"
            value={vistoriaSelecionada}
            onChange={(e) => setVistoriaSelecionada(e.target.value)}
            required
            style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "5px", marginBottom: "10px" }}
          >
            <option value="">-- Selecione a vistoria --</option>

            {vistoriasPendentes.map((v) => (
              <option key={v.idvistoria} value={v.idvistoria}>
                {v.nomeempreendimento
                  ? `${v.nomeempreendimento} - Bloco ${v.bloco ?? ""}, Nº ${v.numero ?? ""}`
                  : `Vistoria #${v.idvistoria}`}
              </option>
            ))}
          </select>

          <label htmlFor="data">Data Desejada:</label>
          <input
            type="date"
            id="data"
            value={dataDesejada}
            onChange={(e) => setDataDesejada(e.target.value)}
            required
            style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "5px", marginBottom: "10px" }}
          />

          <label htmlFor="hora">Hora Desejada:</label>
          <input
            type="time"
            id="hora"
            value={horaDesejada}
            onChange={(e) => setHoraDesejada(e.target.value)}
            required
            style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "5px", marginBottom: "10px" }}
          />

          <label htmlFor="motivo">Motivo:</label>
          <textarea
            id="motivo"
            rows={3}
            maxLength={1000}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            required
            style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "5px", marginBottom: "25px" }}
          />

          <button
            type="submit"
            className="login-button"
            style={{
              backgroundColor: "#007bff",
              color: "white",
              padding: "10px",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              width: "100%",
            }}
            disabled={!vistoriaSelecionada}
          >
            Reagendar
          </button>
        </form>
      </main>
    </div>
  );
}

export default SolicitarNovaVistoria;
