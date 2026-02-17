import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../../Home.css';
import '../Funcionarios.css';

function EditarFuncionario() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    telefone: '',
    cargo: '',
  });

  useEffect(() => {
    async function fetchFuncionario() {
      try {
        const response = await fetch(`http://localhost:3001/api/funcionarios/${id}`);
        const data = await response.json();
        setFormData({
          nome: data.nome || '',
          cpf: data.cpf || '',
          email: data.email || '',
          senha: '',
          confirmarSenha: '',
          telefone: data.telefone || '',
          cargo: data.cargo || '',
        });
      } catch (error) {
        console.error('Erro ao buscar funcionário:', error);
      }
    }

    fetchFuncionario();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'cpf') {
      const raw = value.replace(/\D/g, '');
      const masked = raw
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
        .slice(0, 14);
      setFormData({ ...formData, cpf: masked });
    } else if (name === 'telefone') {
      const raw = value.replace(/\D/g, '');
      const masked = raw
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .slice(0, 15);
      setFormData({ ...formData, telefone: masked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.senha !== formData.confirmarSenha) {
      alert('As senhas não coincidem!');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/funcionarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: formData.nome,
          cpf: formData.cpf,
          email: formData.email,
          senha: formData.senha,
          telefone: formData.telefone,
          cargo: formData.cargo,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(`Erro: ${data.error}`);
        return;
      }

      alert('Funcionário atualizado com sucesso!');
      navigate('/funcionarios');
    } catch (error) {
      console.error('Erro ao atualizar funcionário:', error);
      alert('Erro ao atualizar funcionário. Tente novamente mais tarde.');
    }
  };

  return (
    <div className="home-container">
      <header className="navbar">
        <div className="logo">CIVIS (Admin)</div>
        <nav className="nav-links">
          <a href="#" onClick={() => navigate("/home")}>Home</a>
          <a href="#" onClick={() => navigate("/funcionarios")}>Funcionários</a>
        </nav>
        <button className="logout-button" onClick={() => navigate("/login")}>
          Sair
        </button>
      </header>

      <main className="admin-page-container">
        <button className="back-arrow" onClick={() => navigate('/funcionarios')} style={{ marginBottom: '20px' }}>
          &#8592; Voltar
        </button>
        <h1 className="titulo-centralizado" style={{ color: '#004080' }}>
          Editar Funcionário
        </h1>

        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-group">
            <label htmlFor="nome">Nome Completo:</label>
            <input type="text" id="nome" name="nome" value={formData.nome} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="cpf">CPF:</label>
            <input type="text" id="cpf" name="cpf" value={formData.cpf} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="senha">Nova Senha:</label>
            <input type="password" id="senha" name="senha" value={formData.senha} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="confirmarSenha">Confirmar Nova Senha:</label>
            <input type="password" id="confirmarSenha" name="confirmarSenha" value={formData.confirmarSenha} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="telefone">Telefone:</label>
            <input type="text" id="telefone" name="telefone" value={formData.telefone} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="cargo">Cargo:</label>
            <select id="cargo" name="cargo" value={formData.cargo} onChange={handleChange} required>
              <option value="">Selecione</option>
              <option value="Administrador">Administrador</option>
              <option value="Vistoriador">Vistoriador</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancelar" onClick={() => navigate('/funcionarios')}>
              Cancelar
            </button>
            <button type="submit" className="btn-salvar">
              Salvar Alterações
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default EditarFuncionario;
