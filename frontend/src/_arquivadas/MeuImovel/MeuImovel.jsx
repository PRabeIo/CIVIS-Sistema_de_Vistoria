import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../HomeCliente'; 

function MeusImoveis() {
  const navigate = useNavigate();

  const imoveis = [
    { id: 1, nome: 'Apartamento Central', endereco: 'Rua Exemplo, 123', tipo: 'Apartamento' },
    { id: 2, nome: 'Casa no Campo', endereco: 'Av. Principal, 456', tipo: 'Casa' },
    { id: 3, nome: 'Loja Comercial', endereco: 'Travessa da Paz, 789', tipo: 'Comercial' },
  ];

  return (
    <div className="home-container"> 
      <header className="navbar">
        <div className="logo">CIVIS</div>
        <nav className="nav-links">
          <a href="#" onClick={() => navigate("/home")}>Home</a>
          <a href="#" onClick={() => navigate("/agendar-vistoria")}>Agendar Vistoria</a>
          <a href="#" onClick={() => navigate("/minhas-vistorias")}>Minhas Vistorias</a>
          <a href="#" onClick={() => navigate("/meus-imoveis")}>Meus Imóveis</a>
        </nav>
        <button className="logout-button" onClick={() => navigate("/login")}>
          Sair
        </button>
      </header>

      <main className="main-content" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
        <h1 style={{ color: '#001f3f', marginBottom: '30px', marginLeft: '20px' }}>Meus Imóveis</h1>

        {/*Seção dos cards de seleção*/}
        <div className="imoveis-list"  >
          {imoveis.map(imovel => (
            <div className ="card">
              <h3 >{imovel.nome}</h3>
              <p><strong>Endereço:</strong> {imovel.endereco}</p>
              <p><strong>Tipo:</strong> {imovel.tipo}</p>
              <button
                className="login-button" 
                onClick={() => navigate(`/imovel-detalhes/${imovel.id}`)}
                style={{ marginTop: '15px', width: '100%' }}
              >
                Ver Detalhes
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default MeusImoveis;