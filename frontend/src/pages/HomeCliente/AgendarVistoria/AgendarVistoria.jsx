import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../../services/api";
import "../HomeCliente.css";

function AgendarVistoria() {
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);

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
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!vistoriaSelecionada || !dataDesejada || !horaDesejada) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    // ✅ validação forte no front (impede agendar no passado mesmo com devtools)
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
    <div className="home-container">
      {/* ✅ Navbar padrão CIVIS (igual outras páginas) */}
      <header className="navbar">
        <div className="logo">CIVIS</div>

        <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
          <a href="#" onClick={() => navigate("/home-cliente")}>Home</a>
          <a href="#" onClick={() => navigate("/meus-imoveis")}>Meus Imóveis</a>
          <a href="#" onClick={() => navigate("/minhas-vistorias")}>Minhas Vistorias</a>
          <a href="#" onClick={() => navigate("/agendar-vistoria")}>Agendar Vistoria</a>

          <button className="logout-button mobile-logout" onClick={doLogout}>
            Sair
          </button>
        </nav>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          ☰
        </button>

        <button className="logout-button desktop-logout" onClick={doLogout}>
          Sair
        </button>
      </header>

      <main
        className="main-content"
        style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
      >
        {/* ✅ removido botão Voltar */}

        <h1 className="titulo-centralizado">Agendar Vistoria</h1>

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
          <label htmlFor="vistoria">Selecione o Imóvel:</label>
          <select
            id="vistoria"
            value={vistoriaSelecionada}
            onChange={(e) => setVistoriaSelecionada(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "5px",
              marginBottom: "10px",
            }}
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

          <label htmlFor="data">Data Desejada:</label>
          <input
            type="date"
            id="data"
            value={dataDesejada}
            onChange={(e) => {
              const novaData = e.target.value;
              setDataDesejada(novaData);

              // ✅ se trocar pra "hoje" e a hora escolhida ficou no passado, limpa
              if (novaData === hoje && horaDesejada && horaDesejada < minHoraHoje) {
                setHoraDesejada("");
              }
            }}
            min={hoje}
            required
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "5px",
              marginBottom: "10px",
            }}
          />

          <label htmlFor="hora">Hora Desejada:</label>
          <input
            type="time"
            id="hora"
            value={horaDesejada}
            onChange={(e) => setHoraDesejada(e.target.value)}
            min={minHora}
            required
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "5px",
              marginBottom: "25px",
            }}
          />

          <button type="submit" className="login-button">
            Agendar
          </button>
        </form>
      </main>
    </div>
  );
}

export default AgendarVistoria;
