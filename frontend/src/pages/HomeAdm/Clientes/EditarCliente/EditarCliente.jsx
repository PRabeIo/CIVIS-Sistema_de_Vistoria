import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../../Home.css';
import '../Clientes.css';

function EditarCliente() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    telefone: '',
  });

  const [nomeOriginal, setNomeOriginal] = useState('');

  useEffect(() => {
    async function fetchCliente() {
      try {
        const response = await fetch(`http://localhost:3001/api/clientes/${id}`);
        if (!response.ok) throw new Error('Cliente não encontrado');

        const data = await response.json();
        setFormData({
          nome: data.nome || '',
          cpf: data.cpf || '',
          email: data.email || '',
          senha: data.senha || '',
          confirmarSenha: data.senha || '', // preenchido igual por padrão
          telefone: data.telefone || '',
        });

        setNomeOriginal(data.nome || '');
      } catch (error) {
        alert('Cliente não encontrado!');
        navigate('/clientes');
      }
    }

    fetchCliente();
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'cpf') {
      const raw = value.replace(/\D/g, '');
      const masked = raw
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
        .slice(0, 14);
      setFormData((prev) => ({ ...prev, cpf: masked }));
    } else if (name === 'telefone') {
      const raw = value.replace(/\D/g, '');
      const masked = raw
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .slice(0, 15);
      setFormData((prev) => ({ ...prev, telefone: masked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (formData.senha !== formData.confirmarSenha) {
      alert('As senhas não coincidem!');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/clientes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: formData.nome,
          cpf: formData.cpf,
          email: formData.email,
          senha: formData.senha,
          telefone: formData.telefone,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao atualizar cliente.');
      }

      alert('Cliente atualizado com sucesso!');
      navigate('/clientes');
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar cliente.');
    }
  };

  return (
    <div className="home-container">
      <header className="navbar">
        <div className="logo">CIVIS (Admin)</div>
        <nav className="nav-links">
          <a href="#" onClick={() => navigate("/home")}>Home</a>
          <a href="#" onClick={() => navigate("/clientes")}>Clientes</a>
        </nav>
        <button className="logout-button" onClick={() => navigate("/login")}>
          Sair
        </button>
      </header>

      <main className="admin-page-container">
        <button className="back-arrow" onClick={() => navigate('/clientes')} style={{ marginBottom: '20px' }}>
          &#8592; Voltar
        </button>
        <h1 className="titulo-centralizado" style={{ color: '#004080' }}>
          Editar Cliente: {nomeOriginal}
        </h1>

        <form onSubmit={handleUpdate} className="form-container" style={{ maxWidth: '450px' }}>
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
            <label htmlFor="senha">Senha:</label>
            <input type="password" id="senha" name="senha" value={formData.senha} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="confirmarSenha">Confirmar Senha:</label>
            <input type="password" id="confirmarSenha" name="confirmarSenha" value={formData.confirmarSenha} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="telefone">Telefone:</label>
            <input type="tel" id="telefone" name="telefone" value={formData.telefone} onChange={handleChange} />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancelar" onClick={() => navigate('/clientes')}>
              Cancelar
            </button>
            <button type="submit" className="btn-salvar">
              Atualizar Cliente
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default EditarCliente;
