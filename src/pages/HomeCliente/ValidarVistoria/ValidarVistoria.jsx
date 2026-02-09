import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../HomeCliente.css';

function ValidarVistoria() {
  const navigate = useNavigate();
  const [imovelSelecionado, setImovelSelecionado] = useState('');
  const [vistoriaSelecionada, setVistoriaSelecionada] = useState(null);
  const [relatorioUrl, setRelatorioUrl] = useState('');
  const [imoveisPendentes, setImoveisPendentes] = useState([]);

  useEffect(() => {
    const fetchImoveisPendentes = async () => {
      const idcliente = localStorage.getItem('idcliente');
      if (!idcliente) {
        alert('Cliente não logado.');
        return;
      }

      try {
        const res = await fetch(`http://localhost:3001/api/vistorias/cliente/${idcliente}/pendentes-validacao`);
        if (!res.ok) throw new Error('Erro ao buscar imóveis pendentes de validação');
        const data = await res.json();
        setImoveisPendentes(data);
      } catch (err) {
        console.error(err);
        alert('Erro ao carregar imóveis pendentes.');
      }
    };

    fetchImoveisPendentes();
  }, []);

  const handleSelectChange = (e) => {
    const idSelecionado = Number(e.target.value);
    setImovelSelecionado(idSelecionado);

    const imovel = imoveisPendentes.find(i => i.idimovel === idSelecionado);
    setRelatorioUrl(imovel?.relatorio_url || '');
    setVistoriaSelecionada(imovel?.idvistoria || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!vistoriaSelecionada) {
      alert('Por favor, selecione um imóvel válido com vistoria.');
      return;
    }

    try {
      const res = await fetch(`http://localhost:3001/api/vistorias/validar/${vistoriaSelecionada}`, {
        method: 'PUT',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao validar vistoria');
      }

      alert('Vistoria validada com sucesso!');
      navigate('/home-funcionario');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRejeitar = async () => {
    if (!vistoriaSelecionada) {
      alert('Por favor, selecione um imóvel válido com vistoria para rejeitar.');
      return;
    }

    if (!window.confirm('Tem certeza que deseja rejeitar esta vistoria?')) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:3001/api/vistorias/rejeitar/${vistoriaSelecionada}`, {
        method: 'PUT',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao rejeitar vistoria');
      }

      alert('Vistoria rejeitada com sucesso!');
      navigate('/home-funcionario');
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="home-container">
      <header className="navbar">
        <div className="logo">CIVIS</div>
        <nav className="nav-links">
          <a href="#" onClick={() => navigate("/home-funcionario")}>Home</a>
          <a href="#" onClick={() => navigate("/validar-vistoria")}>Validar Vistoria</a>
        </nav>
        <button className="logout-button" onClick={() => navigate("/login")}>
          Sair
        </button>
      </header>

      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button className="back-arrow" onClick={() => navigate("/home-funcionario")} style={{ marginBottom: '20px', marginLeft: '20px' }}>
          &#8592; Voltar
        </button>
        <h1 className="titulo-centralizado">Validar Vistoria</h1>

        <form
          onSubmit={handleSubmit}
          className="login-form"
          style={{
            width: '80%',
            maxWidth: '400px',
            padding: '30px',
            backgroundColor: 'white',
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}
        >
          <label htmlFor="imovel">Selecione o Imóvel:</label>
          <select
            id="imovel"
            value={imovelSelecionado}
            onChange={handleSelectChange}
            required
            style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', marginBottom: '15px' }}
          >
            <option value="">-- Selecione um imóvel --</option>
            {imoveisPendentes.map(imovel => (
              <option key={imovel.idimovel} value={imovel.idimovel}>
                {imovel.descricao || `${imovel.nomeempreendimento} - Bloco ${imovel.bloco}, Nº ${imovel.numero}`}
              </option>
            ))}
          </select>

          {relatorioUrl && (
            <div style={{ marginBottom: '15px' }}>
              <a
                href={relatorioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="login-button"
                style={{
                  backgroundColor: '#007bff',
                  textDecoration: 'none',
                  color: 'white',
                  display: 'inline-block',
                  padding: '10px 20px',
                  borderRadius: '5px'
                }}
              >
                Visualizar PDF
              </a>
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            style={{ backgroundColor: 'white' }}
          >
            Validar Vistoria
          </button>
          <button
            type="button"
            className="login-button"
            onClick={() => navigate("/reagendar-vistoria")}
            style={{ marginBottom: '10px' }}
          >
            Solicitar Nova Vistoria
          </button>

          <button
            type="button"
            className="login-button"
            onClick={handleRejeitar}
            style={{ backgroundColor: '#dc3545' }}
          >
            Rejeitar Vistoria
          </button>

          <button
            type="button"
            className="login-button"
            onClick={() => navigate('/home')}
          >
            Voltar para Home
          </button>
        </form>
      </main>
    </div>
  );
}

export default ValidarVistoria;
