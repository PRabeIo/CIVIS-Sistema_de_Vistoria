import "./HomeCliente.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiFetch } from "../../services/api";

function Home({ onLogout }) {
  const navigate = useNavigate();

  const usuario = JSON.parse(localStorage.getItem("usuario"));
  const clienteId = usuario?.id;

  const [imoveis, setImoveis] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fetchImoveis = async () => {
      try {
        const data = await apiFetch("/imoveis/me", { method: "GET" });
        setImoveis(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erro ao buscar imóveis:", err);

        if (String(err.message).toLowerCase().includes("token")) {
          alert("Sessão expirada. Faça login novamente.");
          onLogout();
          return;
        }

        alert(err.message || "Erro ao buscar imóveis.");
      }
    };

    fetchImoveis();
  }, [onLogout]);


  // Helper pra pegar campos independente do nome (evita quebrar se mudar no backend)
  const getIdVistoria = (imovel) => imovel.idvistoria_atual ?? imovel.idvistoria;
  const getStatus = (imovel) => imovel.status_vistoria ?? imovel.status;
  const getImg = (imovel) =>
    imovel.anexos_empreendimento ?? imovel.anexos ?? imovel.imagemempreendimento;
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
      <header className="navbar">
        <div className="logo">CIVIS</div>

        <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
          <a href="#" onClick={() => navigate("/home-cliente")}>Home</a>
          <a href="#" onClick={() => navigate("/meus-Imoveis")}>Meus Imóveis</a>
          <a href="#" onClick={() => navigate("/minhas-vistorias")}>Minhas Vistorias</a>
          <a href="#" onClick={() => navigate("/agendar-vistoria")}>Agendar Vistoria</a>
          <a href="#" onClick={() => navigate("/validar-vistoria")}>Validar Vistoria</a>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate("/perfil-cliente"); }}>Perfil</a>
          <button className="logout-button mobile-logout" onClick={onLogout}>Sair</button>
        </nav>

        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          ☰
        </button>

        <button className="logout-button desktop-logout" onClick={onLogout}>Sair</button>
      </header>

      <main className="main-content">
        <div className="texto">
          <h1>Bem-vindo ao <br /> <span>CIVIS Cliente</span></h1>
          <p>Visualize suas vistorias e acompanhe o progresso.</p>
        </div>
        <div className="imagem">
          <img src="/imagens/vistoria.png" alt="Imagem Vistoria" />
        </div>
      </main>

      <div className="botao-central-container">
        <button className="botao-central" onClick={() => navigate("/agendar-vistoria")}>
          Agendar Vistoria
        </button>

        <button className="botao-validar" onClick={() => navigate("/validar-vistoria")}>
          Validar Vistoria
        </button>
      </div>

      <section className="possible-surveys-section">
        <div className="menu-header-surveys">
          <h2>Imóveis e Vistorias</h2>
          <div className="search-bar-and-add-surveys">
            <div className="search-input-wrapper">
              <input type="text" placeholder="Pesquisar Vistoria..." className="search-input" />
              <span className="search-icon">🔍</span>
            </div>
          </div>
        </div>

        <div className="survey-cards-container">
          {imoveis.map((imovel) => {
            const idVistoria = getIdVistoria(imovel);
            const status = getStatus(imovel);
            const img = getImg(imovel);
            const fim = imovel.datahorafim || null;
            const inicio = imovel.datahorainicio || null;
            const agendada = imovel.dataagendada || null;

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
              <div key={imovel.idimovel} className="survey-card">
                <img
                  src={img ? `http://localhost:3001/uploads/${img}` : "/imagens/vistoria.png"}
                  alt={`Imagem do imóvel ${imovel.descricao || ""}`}
                  className="survey-image"
                />

                <h3>
                  {imovel.nomeempreendimento} - Bloco {imovel.bloco}, Nº {imovel.numero}
                </h3>

                <p>
                  Status: {status}
                  <br />

                  {labelData && valorData ? (
                    <span>{labelData}: {valorData}</span>
                  ) : null}
                </p>

                {idVistoria && (
                  <button
                    className="view-survey-button"
                    onClick={() => navigate(`/cliente/vistoria/${idVistoria}`)}
                  >
                    Ver Detalhes
                  </button>
                )}
              </div>
            );
          })}
        </div>

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

export default Home;
