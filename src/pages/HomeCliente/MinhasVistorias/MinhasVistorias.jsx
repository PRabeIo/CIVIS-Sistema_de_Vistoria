import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../HomeCliente.css'; 

function MinhasVistorias() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('solicitadas'); 

  
  const vistorias = {
    solicitadas: [
      { id: 101, imovel: 'Apartamento Central', data: '2025-07-01', status: 'Aguardando Aprovação' },
      { id: 102, imovel: 'Casa no Campo', data: '2025-07-05', status: 'Aguardando Agendamento' },
    ],
    validadas: [
      { id: 201, imovel: 'Apartamento Central', data: '2025-06-15', status: 'Concluída - Validada' },
    ],
    historico: [
      { id: 301, imovel: 'Loja Comercial', data: '2024-11-20', status: 'Concluída - Histórico' },
      { id: 302, imovel: 'Apartamento Central', data: '2024-03-10', status: 'Cancelada' },
    ],
  };

  const renderVistorias = (list) => {
    if (list.length === 0) {
      return <p style={{ textAlign: 'center', marginTop: '20px', color: '#555' }}>Nenhuma vistoria encontrada nesta categoria.</p>;
    }
    return (
      <div className="vistorias-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
        {list.map(vistoria => (
          <div key={vistoria.id} className="card" style={{ width: '280px', padding: '20px' }}>
            <h3 style={{ marginBottom: '10px' }}>Vistoria #{vistoria.id}</h3>
            <p><strong>Imóvel:</strong> {vistoria.imovel}</p>
            <p><strong>Data:</strong> {vistoria.data}</p>
            <p><strong>Status:</strong> {vistoria.status}</p>
            <button
              className="login-button" 
              onClick={() => alert(`Detalhes da vistoria ${vistoria.id}`)} 
              style={{ marginTop: '15px', width: '100%' }}
            >
              Ver Detalhes
            </button>
          </div>
        ))}
      </div>
    );
  };

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
        <button className="back-arrow" onClick={() => navigate("/home")} style={{ marginBottom: '20px', marginLeft: '20px' }}>
          &#8592; Voltar
        </button>
        <h1 style={{ color: '#001f3f', marginBottom: '30px', marginLeft: '20px' }}>Minhas Vistorias</h1>

        <div className="tabs" style={{ display: 'flex', marginBottom: '20px', marginLeft: '20px', borderBottom: '1px solid #ccc' }}>
          <button
            style={{
              padding: '10px 20px',
              border: 'none',
              background: activeTab === 'solicitadas' ? '#004080' : 'transparent',
              color: activeTab === 'solicitadas' ? 'white' : '#004080',
              cursor: 'pointer',
              fontWeight: 'bold',
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px',
            }}
            onClick={() => setActiveTab('solicitadas')}
          >
            Solicitadas
          </button>
          <button
            style={{
              padding: '10px 20px',
              border: 'none',
              background: activeTab === 'validadas' ? '#004080' : 'transparent',
              color: activeTab === 'validadas' ? 'white' : '#004080',
              cursor: 'pointer',
              fontWeight: 'bold',
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px',
            }}
            onClick={() => setActiveTab('validadas')}
          >
            Validadas
          </button>
          <button
            style={{
              padding: '10px 20px',
              border: 'none',
              background: activeTab === 'historico' ? '#004080' : 'transparent',
              color: activeTab === 'historico' ? 'white' : '#004080',
              cursor: 'pointer',
              fontWeight: 'bold',
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px',
            }}
            onClick={() => setActiveTab('historico')}
          >
            Histórico
          </button>
        </div>

        <div className="tab-content" style={{ width: '100%' }}>
          {activeTab === 'solicitadas' && renderVistorias(vistorias.solicitadas)}
          {activeTab === 'validadas' && renderVistorias(vistorias.validadas)}
          {activeTab === 'historico' && renderVistorias(vistorias.historico)}
        </div>
      </main>
    </div>
  );
}

export default MinhasVistorias;