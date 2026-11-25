import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../services/api";
import "./HomeVistoriador.css";
import Navbar from "../components/Navbar/Navbar"; // ajuste o caminho se necessário
import { SERVER_URL } from "../../config";

function HomeVistoriador({ onLogout }) {
  const navigate = useNavigate();

  const [vistorias, setVistorias] = useState([]);
  const [search, setSearch] = useState("");

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
        setVistorias(Array.from(map.values()));
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

  // prioridade: Validada > Agendada/Reagendada > Finalizada > outros
  const prioridadeStatus = (statusRaw) => {
    const s = String(statusRaw || "").toLowerCase();

    if (s.includes("validad")) return 1; // Validada / Validado
    if (s.includes("reagend")) return 2; // Reagendada
    if (s.includes("agend")) return 2; // Agendada
    if (s.includes("aguard")) return 3; // Aguardando Validação
    if (s.includes("final")) return 99; // Finalizada

    // Outros status vem antes de Finalizada
    return 4;
  };

  const normalizar = (txt) =>
    String(txt || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const vistoriasOrdenadasEFiltradas = useMemo(() => {
    const term = normalizar(search);

    const filtradas = vistorias.filter((v) => {
      if (!term) return true;

      const alvo = normalizar(
        [v.nomeempreendimento, v.bloco, v.numero, v.status, v.idvistoria].join(" ")
      );

      return alvo.includes(term);
    });

    const ordenadas = [...filtradas].sort((x, y) => {
      const px = prioridadeStatus(x.status);
      const py = prioridadeStatus(y.status);
      if (px !== py) return px - py;

      const dx = x.dataagendada ? new Date(x.dataagendada).getTime() : Infinity;
      const dy = y.dataagendada ? new Date(y.dataagendada).getTime() : Infinity;
      return dx - dy;
    });

    return ordenadas;
  }, [vistorias, search]);

  const handleLogout = () => {
    if (onLogout) return onLogout();
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/login");
  };

  return (
    <div className="home-container home-vistoriador-page">
      <Navbar onLogout={handleLogout} />

      <main className="main-content">
        <div className="texto">
          <h1>
            Bem-vindo ao <br /> <span>CIVIS Vistoriador</span>
          </h1>
          <p>Visualize vistorias disponíveis e as suas vistorias em andamento/finalizadas.</p>
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="search-icon">🔍</span>
            </div>
          </div>
        </div>

        <div className="survey-cards-container">
          {vistoriasOrdenadasEFiltradas.map((v) => {
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
              labelData = "Data de Início";
              valorData = formatarDataHoraBR(inicio);
            } else if (agendada) {
              labelData = "Data Agendada";
              valorData = formatarDataHoraBR(agendada);
            }

            return (
              <div key={v.idvistoria} className="survey-card">
                <img
                  src={img ? `${SERVER_URL}/uploads/${img}` : "/imagens/vistoria.png"}
                  alt={`Imagem do empreendimento ${v.nomeempreendimento || ""}`}
                  className="survey-image"
                />

                <h3>
                  {v.nomeempreendimento} - Bloco {v.bloco ?? "-"}, Nº {v.numero ?? "-"}
                </h3>

                <p>
                  Status: {v.status}
                  <br />
                  {labelData && valorData ? (
                    <span>
                      {labelData}: {valorData}
                    </span>
                  ) : null}
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

        <div className="pagination">
          <a href="#">&lt;</a>
          <a href="#" className="active">
            1
          </a>
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