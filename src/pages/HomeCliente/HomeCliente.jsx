import "./HomeCliente.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

function Home({ onLogout }) {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem("usuario"));
  const clienteId = usuario?.id;
  const [imoveis, setImoveis] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);


  useEffect(() => {
    const fetchImoveis = async () => {
      const idCliente = localStorage.getItem("idcliente");
      if (!idCliente) {
        alert("Cliente não identificado. Faça login novamente.");
        onLogout();
        return;
      }
      try {
        const res = await fetch(`http://localhost:3001/api/imoveis/cliente/${idCliente}`);
        if (!res.ok) throw new Error("Erro na resposta do servidor.");
        const data = await res.json();
        setImoveis(data);
      } catch (err) {
        console.error("Erro ao buscar imóveis:", err);
      }
    };

    fetchImoveis();
  }, [onLogout]);

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
          <a href="#" onClick={e => { e.preventDefault(); navigate("/perfil-cliente"); }}>Perfil</a>
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
          {imoveis.map((imovel) => (
            <div key={imovel.idimovel} className="survey-card">
              <img
                src={`http://localhost:3001/uploads/${imovel.anexos}`}
                alt={`Imagem do imóvel ${imovel.descricao}`}
                className="survey-image"
              />
              <h3>
                {imovel.nomeempreendimento} - Bloco {imovel.bloco}, Nº {imovel.numero}
              </h3>

              <p>
                Status: {imovel.status} <br />
                {imovel.status === "Finalizada" && imovel.datahorafim ? (
                  <>
                    Data Finalizada:{" "}
                    {new Date(imovel.datahorafim).toLocaleString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </>
                ) : imovel.dataagendada ? (
                  <>
                    Data Agendada:{" "}
                    {(() => {
                      const data = new Date(imovel.dataagendada);
                      return data.toLocaleDateString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric"
                      }) + ' às ' + data.toLocaleTimeString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false
                      });
                    })()}
                  </>
                ) : null}
              </p>

              {imovel.idvistoria && (
                <button
                  className="view-survey-button"
                  onClick={() => navigate(`/cliente/vistoria/${imovel.idvistoria}`)}
                >
                  Ver Detalhes
                </button>
              )}
            </div>
          ))}
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
