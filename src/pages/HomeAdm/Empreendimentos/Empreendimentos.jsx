import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Empreendimentos.css';

function Empreendimentos() {
  const navigate = useNavigate();
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fetchEmpreendimentos = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/empreendimentos');
        if (!response.ok) {
          throw new Error('Erro ao buscar empreendimentos');
        }
        const data = await response.json();
        setEmpreendimentos(data);
      } catch (err) {
        console.error('Erro ao buscar empreendimentos:', err);
        alert('Erro ao buscar empreendimentos. Verifique o console.');
      } finally {
        setLoading(false);
      }
    };

    fetchEmpreendimentos();
  }, []);

  const handleExcluir = async (id, nome) => {
    if (!window.confirm(`Tem certeza que deseja excluir o empreendimento "${nome}"?`)) return;

    try {
      const response = await fetch(`http://localhost:3001/api/empreendimentos/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Erro ao excluir empreendimento');

      setEmpreendimentos((prev) => prev.filter((e) => e.idempreendimento !== id));
      alert(`Empreendimento "${nome}" excluído com sucesso!`);
    } catch (err) {
      console.error('Erro ao excluir:', err);
      alert('Erro ao excluir empreendimento.');
    }
  };

  return (
    <div className="home-container">
      {/* Navbar */}
      <header className="navbar">
        <div className="logo">CIVIS</div>
        
        <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
          <a href="#" onClick={() => navigate("/home")}>Home</a>
          <a href="#" onClick={() => navigate("/nova-vistoria")}>Nova Vistoria</a>
          <a href="#" onClick={() => navigate("/vistorias-agendadas")}>Vistorias Agendadas</a>
          <a href="#" onClick={() => navigate("/clientes")}>Clientes</a>
          <a href="#" onClick={() => navigate("/empreendimentos")}>Empreendimentos</a>
          <a href="#" onClick={() => navigate("/funcionarios")}>Funcionários</a>
          <button className="logout-button mobile-logout" onClick={() => navigate("/login")}>
            Sair
          </button>
        </nav>

        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          ☰
        </button>

        <button className="logout-button desktop-logout" onClick={() => navigate("/login")}>
          Sair
        </button>
      </header>

      {/* Conteúdo principal */}
      <main className="admin-page-container">
        <div className="admin-header">
          <h1 className="titulo-centralizado">Gestão de Empreendimentos</h1>
          <button 
            className="admin-action-button" 
            onClick={() => navigate('/cadastrar-empreendimento')}
          >
            Adicionar Empreendimento
          </button>
        </div>

        {loading ? (
          <p>Carregando empreendimentos...</p>
        ) : empreendimentos.length === 0 ? (
          <p className="sem-registros">Nenhum empreendimento cadastrado.</p>
        ) : (
          <div className="table-responsive">
            <table className="lista-tabela">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Descrição</th>
                  <th>Construtora</th>
                  <th className="mobile-hidden">Observações</th>
                  <th className="mobile-hidden">Endereço</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {empreendimentos.map(emp => (
                  <tr key={emp.idempreendimento}>
                    <td data-label="Nome">{emp.nome}</td>
                    <td data-label="Descrição">{emp.descricao}</td>
                    <td data-label="Construtora">{emp.construtora}</td>
                    <td className="mobile-hidden" data-label="Observações">{emp.observacoes}</td>
                    <td className="mobile-hidden" data-label="Endereço">
                      {emp.rua}, {emp.cidade}/{emp.estado} - {emp.cep}
                    </td>
                    <td className="acoes-botoes">
                      <button 
                        className="btn-editar" 
                        onClick={() => navigate(`/imoveis?empreendimentoid=${emp.idempreendimento}`)}
                      >
                        Exibir Imóveis
                      </button>
                      <button 
                        className="btn-excluir" 
                        onClick={() => handleExcluir(emp.idempreendimento, emp.nome)}
                      >
                        Excluir
                      </button>
                      <button 
                        className="btn-ver-imoveis" 
                        
                      >
                        Exibir Imóveis
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default Empreendimentos;