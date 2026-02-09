import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../../Home.css';

function VistoriaDetalhes() {
  const { id } = useParams(); // ID da vistoria vindo da URL
  const navigate = useNavigate();
  const [vistoria, setVistoria] = useState(null);

  useEffect(() => {
    const fetchVistoria = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/vistorias/${id}`);
        if (!res.ok) {
          throw new Error('Vistoria não encontrada');
        }

        const data = await res.json();

        const sanitizedData = {
          idVistoria: data.idvistoria ?? 'N/A',
          idCliente: data.idcliente ?? 'N/A',
          idImovel: data.idimovel ?? 'N/A',
          idRelatorio: data.idrelatorio ?? 'N/A',
          idVistoriador: data.idvistoriador ?? 'N/A',
          dataInicio: data.datainicio ?? 'N/A',
          dataFim: data.datafim ?? 'N/A',
          status: data.status ?? 'Vistoria Criada',      // Status do imóvel
          observacoes: data.observacoes ?? 'N/A',        // Observação do imóvel
        };

        setVistoria(sanitizedData);
      } catch (error) {
        console.error('Erro ao buscar vistoria:', error);
        alert('Vistoria não encontrada!');
        navigate('/vistorias-agendadas');
      }
    };

    fetchVistoria();
  }, [id, navigate]);

  if (!vistoria) {
    return (
      <div className="home-container">
        <header className="navbar">
          <div className="logo">CIVIS (Admin)</div>
          <nav className="nav-links">
            <a href="#" onClick={() => navigate("/home")}>Home</a>
            <a href="#" onClick={() => navigate("/vistorias-agendadas")}>Vistorias Agendadas</a>
          </nav>
          <button className="logout-button" onClick={() => navigate("/login")}>Sair</button>
        </header>
        <main className="admin-page-container" style={{ textAlign: 'center', marginTop: '50px' }}>
          <h2>Carregando detalhes da vistoria...</h2>
        </main>
      </div>
    );
  }

  return (
    <div className="home-container">
      <header className="navbar">
        <div className="logo">CIVIS (Admin)</div>
        <nav className="nav-links">
          <a href="#" onClick={() => navigate("/home")}>Home</a>
          <a href="#" onClick={() => navigate("/vistorias-agendadas")}>Vistorias Agendadas</a>
        </nav>
        <button className="logout-button" onClick={() => navigate("/login")}>Sair</button>
      </header>

      <main className="admin-page-container">
        <button className="back-arrow" onClick={() => navigate('/vistorias-agendadas')} style={{ marginBottom: '20px' }}>
          &#8592; Voltar para Vistorias Agendadas
        </button>
        <h1 style={{ marginBottom: '30px', color: '#004080' }}>Detalhes da Vistoria: {vistoria.idVistoria}</h1>

        <div className="form-container" style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'left' }}>
          <div className="form-group"><label><strong>ID da Vistoria:</strong></label><p>{vistoria.idVistoria}</p></div>
          <div className="form-group"><label><strong>ID do Cliente:</strong></label><p>{vistoria.idCliente}</p></div>
          <div className="form-group"><label><strong>ID do Imóvel:</strong></label><p>{vistoria.idImovel}</p></div>
          <div className="form-group"><label><strong>ID do Vistoriador:</strong></label><p>{vistoria.idVistoriador}</p></div>
          <div className="form-group"><label><strong>Data de Início:</strong></label><p>{vistoria.dataInicio}</p></div>
          <div className="form-group"><label><strong>Data de Fim:</strong></label><p>{vistoria.dataFim}</p></div>
          <div className="form-group"><label><strong>Status:</strong></label><p>{vistoria.status}</p></div>
          <div className="form-group"><label><strong>ID do Relatório:</strong></label><p>{vistoria.idRelatorio}</p></div>
          <div className="form-group"><label><strong>Observações (Agendamento):</strong></label><p>{vistoria.observacoes}</p></div>

          <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
            <button type="button" className="btn-editar" onClick={() => navigate(`/vistoriador/vistoria/${id}`)}>
              ✏️ Iniciar/Editar Vistoria (Vistoriador)
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default VistoriaDetalhes;
