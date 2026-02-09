import "./home.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

function HomeVistoriador({ onLogout }) {
  const navigate = useNavigate();
  const [imoveis, setImoveis] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const usuario = JSON.parse(localStorage.getItem("usuario"));
  const idFuncionario = usuario?.id;

  useEffect(() => {
    const fetchImoveis = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/imoveis/todos");
        const data = await res.json();
        setImoveis(data);
      } catch (err) {
        console.error("Erro ao buscar imóveis:", err);
      }
    };

    fetchImoveis();
  }, []);

  return (
    <div className="home-container">
      {/* NAVBAR RESPONSIVA */}
      <header className="navbar">
        <div className="logo">CIVIS</div>

        <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
          <a href="#" onClick={() => navigate("/home")}>Home</a>
          <a href="#" onClick={() => navigate(`/vistoriador/historico/${idFuncionario}`)}>Histórico de Vistorias</a>
          <a href="#" onClick={() => navigate(`/vistoriador/perfil-vistoriador/${idFuncionario}`)}>Perfil</a>
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
          <p>
            Gerencie suas vistorias e crie relatórios de forma rápida, prática e eficiente.
          </p>
        </div>
        <div className="imagem">
          <img src="/imagens/vistoria.png" alt="Imagem Vistoria" />
        </div>
      </main>

      <section className="possible-surveys-section">
        <div className="menu-header-surveys">
          <h2>Vistorias Disponíveis</h2>
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
                {imovel.dataagendada && (
                  <span>
                    Data Agendada:{" "}
                    {(() => {
                      const data = new Date(imovel.dataagendada);
                      return (
                        data.toLocaleDateString("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        }) +
                        " às " +
                        data.toLocaleTimeString("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })
                      );
                    })()}
                  </span>
                )}
              </p>

              <button
                className="view-survey-button"
                onClick={() => {
                  if (imovel.idvistoria) {
                    navigate(`/vistoriador/vistoria/${imovel.idvistoria}`);
                  } else {
                    navigate(`/nova-vistoria-para-imovel/${imovel.idimovel}`);
                  }
                }}
              >
                {imovel.idvistoria ? "Ver Vistoria" : "Criar Vistoria"}
              </button>
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

export default HomeVistoriador;
