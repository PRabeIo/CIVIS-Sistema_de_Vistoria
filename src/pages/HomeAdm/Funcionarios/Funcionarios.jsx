import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Funcionarios.css';

function Funcionarios() {
  const navigate = useNavigate();
  const [funcionarios, setFuncionarios] = useState([]);

  // Carrega os funcionários do backend
  useEffect(() => {
    async function fetchFuncionarios() {
      try {
        const response = await fetch('http://localhost:3001/api/funcionarios');
        if (!response.ok) throw new Error('Erro ao buscar funcionários');
        const data = await response.json();
        setFuncionarios(data);
      } catch (error) {
        console.error('Erro ao buscar funcionários:', error);
        alert('Não foi possível carregar os funcionários.');
      }
    }

    fetchFuncionarios();
  }, []);

  // Exclusão com confirmação dupla
  const handleExcluir = async (id, nome) => {
    if (window.confirm(`Tem certeza que deseja excluir o funcionário(a) ${nome}?`)) {
      const confirmacaoFinal = prompt('Para confirmar a exclusão, digite "SIM":');
      if (confirmacaoFinal === 'SIM') {
        try {
          const response = await fetch(`http://localhost:3001/api/funcionarios/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ confirmacao: 'SIM' }),
          });

          if (!response.ok) {
            const errData = await response.json();
            alert(`Erro: ${errData.error}`);
            return;
          }

          setFuncionarios((prev) => prev.filter((f) => f.id !== id));
          alert(`Funcionário(a) ${nome} excluído(a) com sucesso!`);
        } catch (err) {
          console.error('Erro ao excluir funcionário:', err);
          alert('Erro ao excluir funcionário.');
        }
      } else {
        alert('Exclusão cancelada ou confirmação incorreta.');
      }
    }
  };

  return (
    <div className="home-container">
      <header className="navbar">
        <div className="logo">CIVIS Administrador</div>
        <nav className="nav-links">
          <a href="#" onClick={() => navigate('/home')}>Home</a>
          <a href="#" onClick={() => navigate('/funcionarios')}>Funcionários</a>
        </nav>
        <button className="logout-button" onClick={() => navigate('/login')}>
          Sair
        </button>
      </header>

      <main className="admin-page-container">
        <div className="admin-header">
          <h1>Gestão de Funcionários</h1>
          <button
            className="admin-action-button"
            onClick={() => navigate('/cadastrar-funcionario')}
          >
            + Adicionar Funcionário
          </button>
        </div>

        {funcionarios.length === 0 ? (
          <p style={{ textAlign: 'center', marginTop: '50px', color: '#555' }}>
            Nenhum funcionário cadastrado.
          </p>
        ) : (
          <table className="lista-tabela">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>CPF</th>
                <th>Email</th>
                <th>Cargo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {funcionarios.map((func) => (
                <tr key={func.id}>
                  <td data-label="ID">{func.id}</td>
                  <td data-label="Nome">{func.nome}</td>
                  <td data-label="CPF">{func.cpf}</td>
                  <td data-label="Email">{func.email}</td>
                  <td data-label="Cargo">{func.cargo}</td>
                  <td data-label="Ações" className="acoes-botoes">
                    <button
                      className="btn-editar"
                      onClick={() => navigate(`/editar-funcionario/${func.id}`)}
                    >
                      Editar
                    </button>
                    <button
                      className="btn-excluir"
                      onClick={() => handleExcluir(func.id, func.nome)}
                    >
                      Excluir
                    </button>
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

export default Funcionarios;
