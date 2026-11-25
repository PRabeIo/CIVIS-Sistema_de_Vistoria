import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../HomeCliente.css'; 

function ImovelDetalhes() {
  const { id } = useParams(); 
  const navigate = useNavigate();

  const imoveis = [
    { id: 1, nome: 'Apartamento Central', endereco: 'Rua Exemplo, 123', tipo: 'Apartamento', detalhes: 'Um apartamento espaçoso no coração da cidade com 3 quartos e 2 banheiros.' },
    { id: 2, nome: 'Casa no Campo', endereco: 'Av. Principal, 456', tipo: 'Casa', detalhes: 'Casa isolada com grande terreno, ideal para quem busca tranquilidade e natureza.' },
    { id: 3, nome: 'Loja Comercial', endereco: 'Travessa da Paz, 789', tipo: 'Comercial', detalhes: 'Loja com excelente localização, ideal para pequenos negócios. Possui 200m².' },
  ];

  const imovel = imoveis.find(prop => prop.id === parseInt(id));

  if (!imovel) {
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
          <button className="back-arrow" onClick={() => navigate("/meus-imoveis")} style={{ marginBottom: '20px', marginLeft: '20px' }}>
            &#8592; Voltar
          </button>
          <h1 style={{ color: '#001f3f', marginBottom: '30px', marginLeft: '20px' }}>Imóvel não encontrado.</h1>
        </main>
      </div>
    );
  }

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
        <button className="back-arrow" onClick={() => navigate("/meus-imoveis")} style={{ marginBottom: '20px', marginLeft: '20px' }}>
          &#8592; Voltar
        </button>
        <h1 style={{ color: '#001f3f', marginBottom: '30px', marginLeft: '20px' }}>Detalhes do Imóvel: {imovel.nome}</h1>

        <div className="card" style={{ width: '80%', padding: '30px', textAlign: 'left', marginLeft: '20px' }}>
          <h3>{imovel.nome}</h3>
          <p><strong>ID:</strong> {imovel.id}</p>
          <p><strong>Endereço:</strong> {imovel.endereco}</p>
          <p><strong>Tipo:</strong> {imovel.tipo}</p>
          <p><strong>Detalhes:</strong> {imovel.detalhes}</p>
        </div>
      </main>
    </div>
  );
}

export default ImovelDetalhes;