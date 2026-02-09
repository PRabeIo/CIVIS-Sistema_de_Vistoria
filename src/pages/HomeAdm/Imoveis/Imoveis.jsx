import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../home.css';
import './Imoveis.css';

function ListagemImoveis() {
  const navigate = useNavigate();
  const location = useLocation();
  const empreendimentoid = new URLSearchParams(location.search).get('empreendimentoid');

  const [imoveis, setImoveis] = useState([]);
  const [empreendimentoNome, setEmpreendimentoNome] = useState('');
  const [loading, setLoading] = useState(true);

  // Buscar o nome do empreendimento
  useEffect(() => {
    const fetchEmpreendimento = async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/empreendimentos/${empreendimentoid}`);
        if (!response.ok) throw new Error('Erro ao buscar empreendimento');

        const data = await response.json();
        setEmpreendimentoNome(data.nome);  // Campo "nome" vindo do banco
      } catch (error) {
        console.error('Erro ao buscar nome do empreendimento:', error);
        setEmpreendimentoNome('Desconhecido');
      }
    };

    if (empreendimentoid) {
      fetchEmpreendimento();
    }
  }, [empreendimentoid]);

  // Buscar imóveis
  useEffect(() => {
    const fetchImoveis = async () => {
      try {
        const url = `http://localhost:3001/api/empreendimentos/${empreendimentoid}/imoveis`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Erro ao buscar imóveis');

        const data = await response.json();
        setImoveis(data);
      } catch (error) {
        console.error('Erro ao buscar imóveis:', error);
        alert('Erro ao buscar imóveis. Verifique o console.');
      } finally {
        setLoading(false);
      }
    };

    if (empreendimentoid) {
      fetchImoveis();
    }
  }, [empreendimentoid]);

  const handleExcluir = async (id, descricao) => {
    if (!window.confirm(`Tem certeza que deseja excluir o imóvel "${descricao}"?`)) return;

    try {
      const response = await fetch(`http://localhost:3001/api/imoveis/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Erro ao excluir imóvel.');

      setImoveis((prev) => prev.filter((imovel) => imovel.idimovel !== id));
      alert(`Imóvel "${descricao}" excluído com sucesso.`);
    } catch (error) {
      console.error('Erro ao excluir imóvel:', error);
      alert('Erro ao excluir imóvel.');
    }
  };

  return (
    <div className="home-container">
      <header className="navbar">
        <div className="logo">CIVIS (Admin)</div>
        <nav className="nav-links">
          <a href="#" onClick={() => navigate("/home")}>Home</a>
          <a href="#" onClick={() => navigate("/empreendimentos")}>Empreendimentos</a>
          <a href="#" onClick={() => navigate("/imoveis")}>Imóveis</a>
        </nav>
        <button className="logout-button" onClick={() => navigate("/login")}>Sair</button>
      </header>

      <main className="admin-page-container">
        <div className="admin-header">
          <h1>Imóveis do {empreendimentoNome}</h1>
          <button className="admin-action-button" onClick={() => navigate(`/cadastrar-imovel?empreendimentoid=${empreendimentoid}`)}>
            Adicionar Imóvel
          </button>
        </div>

        {loading ? (
          <p>Carregando imóveis...</p>
        ) : imoveis.length === 0 ? (
          <p style={{ textAlign: 'center', marginTop: '50px', color: '#555' }}>
            Nenhum imóvel encontrado para o empreendimento {empreendimentoNome}.
          </p>
        ) : (
          <table className="lista-tabela">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Status</th>
                <th>Vistorias Realizadas</th>
                <th>Bloco</th>
                <th>Número</th>
                <th>Observações</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {imoveis.map((imovel) => (
                <tr key={imovel.idimovel}>
                  <td data-label="Descrição">{imovel.descricao}</td>
                  <td data-label="Status">{imovel.status}</td>
                  <td data-label="Vistorias Realizadas">{imovel.vistoriasrealizadas}</td>
                  <td data-label="Bloco">{imovel.bloco}</td>
                  <td data-label="Número">{imovel.numero}</td>
                  <td data-label="Observações">{imovel.observacao}</td>
                  <td className="acoes-botoes" data-label="Ações">

                    <button className="btn-editar" onClick={() => navigate(`/visualizar-imovel/${imovel.idimovel}`)}>Visualizar</button>
                    <button className="btn-editar" onClick={() => navigate(`/editar-imovel/${imovel.idimovel}`)}>Editar</button>
                    <button className="btn-excluir" onClick={() => handleExcluir(imovel.idimovel, imovel.descricao)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}

export default ListagemImoveis;
