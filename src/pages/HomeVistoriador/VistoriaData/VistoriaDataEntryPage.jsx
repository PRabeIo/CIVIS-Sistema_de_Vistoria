import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import './VistoriaDataEntryPage.css';

function VistoriaDataEntryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [vistoriaDetalhes, setVistoriaDetalhes] = useState(null);
  const [relatorioGerado, setRelatorioGerado] = useState(null);
  const [loading, setLoading] = useState(true);

  const isCliente = location.pathname.includes('/cliente/');

  useEffect(() => {
    if (location.state?.relatorio) {
      setRelatorioGerado(location.state.relatorio);
    }

    const fetchVistoria = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/vistorias/${id}`);
        if (!res.ok) throw new Error('Erro ao buscar vistoria');

        const data = await res.json();
        setVistoriaDetalhes(data);
      } catch (err) {
        console.error('Erro ao carregar detalhes da vistoria:', err);
        alert('Erro ao carregar detalhes da vistoria.');
      } finally {
        setLoading(false);
      }
    };

    fetchVistoria();
  }, [id, location.state]);

  const handleIniciarVistoria = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/vistorias/iniciar/${id}`, {
        method: 'PUT',
      });

      if (!response.ok) {
        const erro = await response.json();
        throw new Error(erro.error || 'Erro ao iniciar a vistoria.');
      }

      navigate(`/vistoriador/iniciar-vistoria-detalhes/${id}`);
    } catch (err) {
      console.error('Erro ao iniciar a vistoria:', err);
    }
  };

  const handleFinalizarVistoria = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/vistorias/finalizar/${id}`, {
        method: 'PUT',
      });

      if (!res.ok) {
        const erro = await res.json();
        throw new Error(erro.error || 'Erro ao finalizar vistoria.');
      }

      alert('Vistoria finalizada com sucesso!');
      navigate('/home');
    } catch (err) {
      console.error('Erro ao finalizar a vistoria:', err);
      alert(err.message);
    }
  };

  if (loading) return <div>Carregando detalhes da vistoria...</div>;
  if (!vistoriaDetalhes) return <div>Vistoria não encontrada.</div>;

  return (
    <div className="vistoria-data-entry-container">
      <h1>{vistoriaDetalhes.nomeempreendimento || `Detalhes da Vistoria ID: ${id}`}</h1>

      {vistoriaDetalhes.anexos && (
        <img
          src={`http://localhost:3001/uploads/${vistoriaDetalhes.anexos}`}
          alt="Imagem do Imóvel"
          className="imagem-empreendimento"
        />
      )}

      {relatorioGerado && (
        <div className="info-line">
          <span className="label">Relatório Gerado:</span>
          <a
            href={`http://localhost:3001/relatorios/${relatorioGerado}`}
            target="_blank"
            rel="noopener noreferrer"
            className="value"
          >
            Visualizar PDF
          </a>
        </div>
      )}

      <div className="vistoria-form">
        <div className="info-line">
          <span className="label">Cliente:</span>
          <span className="value">
            {vistoriaDetalhes.nomecliente || ''} [{vistoriaDetalhes.cpfcliente || ''}]
          </span>
        </div>

        <div className="info-line">
          <span className="label">Descrição do Imóvel:</span>
          <span className="value">{vistoriaDetalhes.descricao}</span>
        </div>

        <div className="double-line-group">
          <div className="info-line">
            <span className="label">Estado:</span>
            <span className="value">{vistoriaDetalhes.estado}</span>
          </div>
          <div className="info-line">
            <span className="label">Cidade:</span>
            <span className="value">{vistoriaDetalhes.cidade}</span>
          </div>
        </div>

        <div className="double-line-group">
          <div className="info-line">
            <span className="label">CEP:</span>
            <span className="value">{vistoriaDetalhes.cep}</span>
          </div>
          <div className="info-line">
            <span className="label">Rua:</span>
            <span className="value">{vistoriaDetalhes.rua}</span>
          </div>
        </div>

        <div className="double-line-group">
          <div className="info-line">
            <span className="label">Bloco:</span>
            <span className="value">{vistoriaDetalhes.bloco}</span>
          </div>
          <div className="info-line">
            <span className="label">Número:</span>
            <span className="value">{vistoriaDetalhes.numero}</span>
          </div>
        </div>

        <div className="info-line">
          <span className="label">Vistorias Realizadas:</span>
          <span className="value">{vistoriaDetalhes.vistoriasrealizadas ?? 0}</span>
        </div>

        <div className="info-line">
          <span className="label">Status da Vistoria:</span>
          <span className="value">{vistoriaDetalhes.status ?? 'Indefinido'}</span>
        </div>

        <div className="info-line">
          <span className="label">Data Agendada:</span>
          <span className="value">
            {vistoriaDetalhes.dataagendada
              ? (() => {
                  const data = new Date(vistoriaDetalhes.dataagendada);
                  return (
                    data.toLocaleDateString('pt-BR', {
                      timeZone: 'America/Sao_Paulo',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    }) +
                    ' às ' +
                    data.toLocaleTimeString('pt-BR', {
                      timeZone: 'America/Sao_Paulo',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })
                  );
                })()
              : 'N/A'}
          </span>
        </div>

        {!isCliente && (
          <div className="form-actions">
            <button onClick={handleIniciarVistoria} className="back-to-list-button start-button">
              Iniciar Vistoria
            </button>
            <button onClick={handleFinalizarVistoria} className="back-to-list-button finalize-button">
              Finalizar Vistoria
            </button>
          </div>
        )}
      </div>

      <button onClick={() => navigate('/home')} className="back-to-list-button">
        Voltar para a Home
      </button>
    </div>
  );
}

export default VistoriaDataEntryPage;
