import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../../services/api";
import "./AgendarVistoria.css";
import Navbar from "../../components/Navbar/Navbar"; 

function AgendarVistoria() {
  const navigate = useNavigate();

  const [vistoriaSelecionada, setVistoriaSelecionada] = useState("");
  const [dataDesejada, setDataDesejada] = useState("");
  const [horaDesejada, setHoraDesejada] = useState("");
  const [imoveisDisponiveis, setImoveisDisponiveis] = useState([]);

  const doLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/login");
  };

  const pad2 = (n) => String(n).padStart(2, "0");

  // "hoje" no formato YYYY-MM-DD (compatível com input[type="date"])
  const hoje = useMemo(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  }, []);

  // hora mínima quando a data escolhida for hoje (HH:mm)
  const minHoraHoje = useMemo(() => {
    const now = new Date();
    return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  }, []);

  const minHora = dataDesejada === hoje ? minHoraHoje : undefined;

  useEffect(() => {
    const fetchImoveis = async () => {
      try {
        const data = await apiFetch("/vistorias/minhas/pendentes-agendamento", {
          method: "GET",
        });

        setImoveisDisponiveis(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erro ao buscar imóveis disponíveis:", err);

        if (String(err.message).toLowerCase().includes("token")) {
          alert("Sessão expirada. Faça login novamente.");
          doLogout();
          return;
        }

        alert(err.message || "Erro ao carregar imóveis.");
      }
    };

    fetchImoveis();
  }, [navigate]); // keep navigate to satisfy linter if used elsewhere

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!vistoriaSelecionada || !dataDesejada || !horaDesejada) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    // validação forte no front (impede agendar no passado mesmo com devtools)
    const dtSelecionada = new Date(`${dataDesejada}T${horaDesejada}:00`);
    if (Number.isNaN(dtSelecionada.getTime())) {
      alert("Data/hora inválida.");
      return;
    }

    if (dtSelecionada.getTime() < Date.now()) {
      alert("Escolha uma data e hora no futuro.");
      return;
    }

    try {
      await apiFetch(`/vistorias/${vistoriaSelecionada}/agendar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataagendada: dataDesejada,
          horaagendada: horaDesejada,
        }),
      });

      alert("Vistoria agendada com sucesso!");
      navigate("/home-cliente");
    } catch (err) {
      alert(err.message || "Erro ao agendar vistoria.");
    }
  };

  return (
    <div className="home-container agendar-vistoria-page">
      {/* Navbar reutilizável */}
      <Navbar onLogout={doLogout} />

      <main className="admin-page-container">
        <div className="page-header">
          <h1 className="titulo-centralizado">Agendar Vistoria</h1>
        </div>

        <form onSubmit={handleSubmit} className="form-card">
          {/* Imóvel */}
          <div className="form-group">
            <label htmlFor="vistoria">Selecione o Imóvel:</label>
            <select
              id="vistoria"
              value={vistoriaSelecionada}
              onChange={(e) => setVistoriaSelecionada(e.target.value)}
              required
            >
              <option value="">-- Selecione um imóvel --</option>

              {imoveisDisponiveis.map((v) => (
                <option key={v.idvistoria} value={v.idvistoria}>
                  {v.nomeempreendimento
                    ? `${v.nomeempreendimento} - Bloco ${v.bloco ?? ""}, Nº ${v.numero ?? ""}`
                    : `Vistoria #${v.idvistoria}`}
                </option>
              ))}
            </select>
          </div>

          {/* Data */}
          <div className="form-group">
            <label htmlFor="data">Data Desejada:</label>
            <input
              type="date"
              id="data"
              value={dataDesejada}
              onChange={(e) => {
                const novaData = e.target.value;
                setDataDesejada(novaData);

                if (novaData === hoje && horaDesejada && horaDesejada < minHoraHoje) {
                  setHoraDesejada("");
                }
              }}
              min={hoje}
              required
            />
          </div>

          {/* Hora */}
          <div className="form-group">
            <label htmlFor="hora">Hora Desejada:</label>
            <input
              type="time"
              id="hora"
              value={horaDesejada}
              onChange={(e) => setHoraDesejada(e.target.value)}
              min={minHora}
              required
            />
          </div>

          {/* BOTÕES */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-secundario"
              onClick={() => navigate("/home-cliente")}
            >
              Cancelar
            </button>

            <button type="submit" className="btn-primary">
              Agendar
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default AgendarVistoria;