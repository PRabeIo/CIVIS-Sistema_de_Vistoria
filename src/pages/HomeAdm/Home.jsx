import { useNavigate } from "react-router-dom"; 
import { useState, useEffect } from "react";
import "./home.css";

function HomeAdm({ onLogout }) {
  const navigate = useNavigate(); 
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminId, setAdminId] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("usuario");
    if (stored) {
      const user = JSON.parse(stored);
      setAdminId(user.idadministrador || user.id);
    }
  }, []);

  return (
    <div className="home-container">
      {/* NAVBAR RESPONSIVA */}
      <header className="navbar">
        <div className="logo">CIVIS</div>

        <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
          <a href="#" onClick={() => navigate("/home")}>Home</a>
          <a href="#" onClick={() => navigate("/nova-vistoria")}>Nova Vistoria</a>
          <a href="#" onClick={() => navigate("/vistorias-agendadas")}>Vistorias Agendadas</a>
          <a href="#" onClick={() => navigate("/clientes")}>Clientes</a>
          <a href="#" onClick={() => navigate("/empreendimentos")}>Empreendimentos</a>
          <a href="#" onClick={() => navigate("/funcionarios")}>Funcionários</a>
          {adminId && (
          <a href="#" onClick={() => navigate(`/admin/perfil-administrador/${adminId}`)}>Perfil</a>
          )}
          <button className="logout-button mobile-logout" onClick={onLogout}>Sair</button>
        </nav>

        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
        <button className="logout-button desktop-logout" onClick={onLogout}>Sair</button>
      </header>

      <main className="main-content">
        <div className="texto">
          <h1>
            Bem-vindo ao <br /> <span>CIVIS Administrador</span>
          </h1>
          <p>
            Gerencie, acompanhe e realize vistorias de forma rápida, prática e
            eficiente com o <strong>CIVIS</strong>.
          </p>
        </div>

        <div className="imagem">
          <img src="/imagens/vistoria.png" alt="Imagem Vistoria" />
        </div>
      </main>

      <section className="atalhos">
        <h2>Gerenciamento Rápido</h2>
        <div className="atalhos-cards">
          <div className="card" onClick={() => navigate("/nova-vistoria")}> 
            <img src="/assets/nova.png" alt="Nova Vistoria" />
            <h3>Nova Vistoria</h3>
          </div>
          <div className="card" onClick={() => navigate("/vistorias-agendadas")}> 
            <img src="/assets/agendada.png" alt="Agendadas" />
            <h3>Vistorias Agendadas</h3>
          </div>
          <div className="card" onClick={() => navigate("/clientes")}> 
            <img src="/assets/cliente.png" alt="Clientes" />
            <h3>Clientes</h3>
          </div>
          <div className="card" onClick={() => navigate("/empreendimentos")}> 
            <img src="/assets/empreendimentos.png" alt="Empreendimentos" />
            <h3>Empreendimentos</h3>
          </div>
          <div className="card" onClick={() => navigate("/funcionarios")}> 
            <img src="/assets/funcionario.jpg" alt="Funcionário" />
            <h3>Funcionário</h3>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomeAdm;
