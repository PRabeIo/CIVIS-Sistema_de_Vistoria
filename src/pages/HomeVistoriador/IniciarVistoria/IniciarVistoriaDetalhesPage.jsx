import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './IniciarVistoriaDetalhesPage.css';

function IniciarVistoriaDetalhesPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [vistoriaDetalhesData, setVistoriaDetalhesData] = useState({
    idVistoria: parseInt(id) || null,
    condicoesClimaticas: '',
    imprevistos: '',
    observacoesIniciais: '',
    status: 'EM_ANDAMENTO',
    idRelatorio: null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsLoading(false);
    console.log(`Carregando página de detalhes de vistoria ID: ${id}`);
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setVistoriaDetalhesData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      alert('Dados da vistoria salvos com sucesso!');
    } catch (err) {
      alert("Ocorreu um erro ao salvar os dados.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalizar = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setVistoriaDetalhesData(prev => ({
        ...prev,
        status: 'FINALIZADA'
      }));
      alert('Vistoria finalizada com sucesso!');
    } catch {
      alert("Ocorreu um erro ao finalizar a vistoria.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmitirRelatorio = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const newReportId = Math.floor(Math.random() * 100000) + 1;
      setVistoriaDetalhesData(prev => ({ ...prev, idRelatorio: newReportId }));
      alert(`Relatório ${newReportId} emitido com sucesso!`);
      navigate('/vistoriador/criar-relatorio');
    } catch {
      alert("Ocorreu um erro ao emitir o relatório.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReagendar = () => {
    navigate(`/vistoriador/reagendar-vistoria/${vistoriaDetalhesData.idVistoria}`);
  };

  if (isLoading) return <div className="loading">Carregando formulário de vistoria...</div>;
  if (error) return <div className="error">Erro: {error}</div>;

  return (
    <div className="iniciar-vistoria-detalhes-container">
      <button
        type="button"
        className="back-arrow"
        onClick={() => navigate('/vistoriador/realizar-vistoria')}
      >
        &#8592; Voltar
      </button>

      <h1>NOME DO EMPREENDIMENTO</h1>
      <h2 className="subtitulo-bloco-numero">Bloco x Numero x</h2>

      <p className="description">Preencha os dados e gerencie o processo da vistoria.</p>

      <form className="iniciar-vistoria-form" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="condicoesClimaticas" className="label">Condições Climáticas:</label>
        <input
          type="text"
          id="condicoesClimaticas"
          name="condicoesClimaticas"
          value={vistoriaDetalhesData.condicoesClimaticas}
          onChange={handleChange}
          placeholder="Ex: Ensolarado, Chuvoso, Nublado"
          readOnly={vistoriaDetalhesData.status === 'FINALIZADA'}
        />

        <label htmlFor="imprevistos" className="label">Imprevistos:</label>
        <textarea
          id="imprevistos"
          name="imprevistos"
          value={vistoriaDetalhesData.imprevistos}
          onChange={handleChange}
          placeholder="Registre imprevistos ou eventos fora do esperado"
          readOnly={vistoriaDetalhesData.status === 'FINALIZADA'}
          className="campo-imprevistos"
        />

        <label htmlFor="observacoesIniciais" className="label">Observações Gerais da Vistoria:</label>
        <textarea
          id="observacoesIniciais"
          name="observacoesIniciais"
          value={vistoriaDetalhesData.observacoesIniciais}
          onChange={handleChange}
          placeholder="Registre observações gerais, detalhes da inspeção, etc."
          readOnly={vistoriaDetalhesData.status === 'FINALIZADA'}
        ></textarea>

        <p><strong>Status Atual da Vistoria:</strong> {vistoriaDetalhesData.status === 'FINALIZADA' ? 'Finalizada' : 'Em Andamento'}</p>

        {vistoriaDetalhesData.idRelatorio && (
          <>
            <label htmlFor="idRelatorioDisplay">ID do Relatório:</label>
            <input
              type="text"
              id="idRelatorioDisplay"
              name="idRelatorioDisplay"
              value={vistoriaDetalhesData.idRelatorio}
              readOnly
              className="report-id-display-input"
            />
          </>
        )}

        <div className="form-actions-extended">
          <button
            type="button"
            onClick={handleSave}
            className="action-button save-button"
            disabled={isLoading || vistoriaDetalhesData.status === 'FINALIZADA'}
          >
            {isLoading ? 'Salvando...' : 'Salvar Dados'}
          </button>

          <button
            type="button"
            onClick={handleFinalizar}
            className="action-button finalize-button"
            disabled={isLoading || vistoriaDetalhesData.status !== 'EM_ANDAMENTO'}
          >
            {isLoading ? 'Finalizando...' : 'Finalizar Vistoria'}
          </button>

          <button
            type="button"
            onClick={handleEmitirRelatorio}
            className="action-button report-button"
            disabled={isLoading || vistoriaDetalhesData.status !== 'FINALIZADA' || vistoriaDetalhesData.idRelatorio !== null}
          >
            {isLoading ? 'Gerando...' : 'Emitir Relatório'}
          </button>

          <button
            type="button"
            onClick={handleReagendar}
            className="action-button reschedule-button"
            disabled={isLoading || vistoriaDetalhesData.status === 'FINALIZADA'}
          >
            Reagendar Vistoria
          </button>
        </div>
      </form>
    </div>
  );
}

export default IniciarVistoriaDetalhesPage;
