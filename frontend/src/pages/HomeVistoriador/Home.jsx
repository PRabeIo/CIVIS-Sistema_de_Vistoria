import "./home.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiFetch } from "../../services/api";

function HomeVistoriador({ onLogout }) {
  const navigate = useNavigate();

  const [vistorias, setVistorias] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const usuario = JSON.parse(localStorage.getItem("usuario") || "null");
  const idFuncionario = usuario?.id;

  useEffect(() => {
    const fetchHome = async () => {
      try {
        const [disp, minhas] = await Promise.all([
          apiFetch("/vistorias/disponiveis", { method: "GET" }),
          apiFetch("/vistorias/minhas-vistoriador", { method: "GET" }),
        ]);

        const a = Array.isArray(disp) ? disp : [];
        const b = Array.isArray(minhas) ? minhas : [];

        // merge sem duplicar por idvistoria
        const map = new Map();
        [...a, ...b].forEach((v) => map.set(Number(v.idvistoria), v));
        const merged = Array.from(map.values());

        // ordenar (dataagendada asc, e sem data fica por último)
        merged.sort((x, y) => {
          const dx = x.dataagendada ? new Date(x.dataagendada).getTime() : Infinity;
          const dy = y.dataagendada ? new Date(y.dataagendada).getTime() : Infinity;
          return dx - dy;
        });

        setVistorias(merged);
      } catch (err) {
        console.error("Erro ao buscar vistorias:", err);

        if (String(err.message).toLowerCase().includes("token")) {
          alert("Sessão expirada. Faça login novamente.");
          onLogout?.();
          navigate("/login");
          return;
        }

        alert(err.message || "Erro ao carregar vistorias.");
      }
    };

    fetchHome();
  }, [navigate, onLogout]);

  const formatarDataHoraBR = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);

    const data = d.toLocaleDateString("pt-BR", {
      timeZone: "America/Fortaleza",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const hora = d.toLocaleTimeString("pt-BR", {
      timeZone: "America/Fortaleza",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    return `${data} às ${hora}`;
  };

  return (
    <div className="home-container">
      {/* NAVBAR RESPONSIVA */}
      <header className="navbar">
        <div className="logo">CIVIS</div>

        <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate("/home"); }}>
            Home
          </a>

          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate(`/vistoriador/historico/${idFuncionario}`);
            }}
          >
            Histórico de Vistorias
          </a>

          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate(`/vistoriador/perfil-vistoriador/${idFuncionario}`);
            }}
          >
            Perfil
          </a>

          <button className="logout-button mobile-logout" onClick={onLogout}>
            Sair
          </button>
        </nav>

        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          ☰
        </button>

        <button className="logout-button desktop-logout" onClick={onLogout}>
          Sair
        </button>
      </header>

      <main className="main-content">
        <div className="texto">
          <h1>
            Bem-vindo ao <br /> <span>CIVIS Vistoriador</span>
          </h1>
          <p>Visualize vistorias agendadas e as suas vistorias em andamento/finalizadas.</p>
        </div>

        <div className="imagem">
          <img src="/imagens/vistoria.png" alt="Imagem Vistoria" />
        </div>
      </main>

      <section className="possible-surveys-section">
        <div className="menu-header-surveys">
          <h2>Vistorias</h2>

          <div className="search-bar-and-add-surveys">
            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder="Pesquisar Vistoria..."
                className="search-input"
              />
              <span className="search-icon">🔍</span>
            </div>
          </div>
        </div>

        <div className="survey-cards-container">
          {vistorias.map((v) => {
            // o backend deve mandar imagemempreendimento = 'empreendimentos/<arquivo>'
            const img = v.imagemempreendimento || v.anexos || null;
            const inicio = v.datahorainicio || null;
            const fim = v.datahorafim || null;
            const agendada = v.dataagendada || null;

            let labelData = null;
            let valorData = null;

            if (fim) {
              labelData = "Data de Conclusão";
              valorData = formatarDataHoraBR(fim);
            } else if (inicio) {
              labelData = "Data Iniciada";
              valorData = formatarDataHoraBR(inicio);
            } else if (agendada) {
              labelData = "Data Agendada";
              valorData = formatarDataHoraBR(agendada);
            }

            return (
              <div key={v.idvistoria} className="survey-card">
                <img
                  src={
                    img
                      ? `http://localhost:3001/uploads/${img}`
                      : "/imagens/vistoria.png"
                  }
                  alt={`Imagem do empreendimento ${v.nomeempreendimento || ""}`}
                  className="survey-image"
                />

                <h3>
                  {v.nomeempreendimento} - Bloco {v.bloco ?? "-"}, Nº {v.numero ?? "-"}
                </h3>

                <p>
                  Status: {v.status}
                  <br />
                  {labelData && valorData && (
                    <span>{labelData}: {valorData}</span>
                  )}
                </p>

                <button
                  className="view-survey-button"
                  onClick={() => navigate(`/vistoriador/vistoria/${v.idvistoria}`)}
                >
                  Ver Vistoria
                </button>
              </div>
            );
          })}
        </div>

        {/* Se quiser, pode esconder paginação enquanto não implementa */}
        <div className="pagination">
          <a href="#">&lt;</a>
          <a href="#" className="active">1</a>
          <a href="#">2</a>
          <a href="#">3</a>
          <a href="#">4</a>
          <a href="#">&gt;</a>
        </div>
      </section>
    </div>
  );
}

export default HomeVistoriador;
