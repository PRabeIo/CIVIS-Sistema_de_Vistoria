import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { estadosECidades } from '../../../../utils/estadosECidades';
import '../../Home.css';
import './CadastrarEmpreendimento.css';

function CadastrarEmpreendimento() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nome: '',
    construtora: '',
    estado: '',
    cidade: '',
    cep: '',
    rua: '',
    anexos: null,
  });

  const estados = Object.keys(estadosECidades);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, cidade: '' }));
  }, [formData.estado]);

  const handleChange = (e) => {
    const { name, value, files, type } = e.target;

    if (type === 'file') {
      setFormData((prev) => ({
        ...prev,
        [name]: files[0]
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const form = new FormData();
      for (const key in formData) {
        if (formData[key]) {
          form.append(key, formData[key]);
        }
      }

      const response = await fetch('http://localhost:3001/api/empreendimentos', {
        method: 'POST',
        body: form
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Erro desconhecido ao cadastrar." }));
        throw new Error(errorData.message || `Erro ao cadastrar empreendimento: ${response.status}`);
      }

      alert('Empreendimento cadastrado com sucesso!');
      navigate('/empreendimentos');
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      alert('Erro ao cadastrar empreendimento. Verifique o console. ' + error.message);
    }
  };

  return (
    <div className="home-container">
      <header className="navbar">
        <div className="logo">CIVIS (Admin)</div>
        <nav className="nav-links">
          <a href="#" onClick={() => navigate("/home")}>Home</a>
          <a href="#" onClick={() => navigate("/empreendimentos")}>Empreendimentos</a>
        </nav>
        <button className="logout-button" onClick={() => navigate("/login")}>Sair</button>
      </header>

      <main className="admin-page-container">
        <button className="back-arrow" onClick={() => navigate('/empreendimentos')}>
          &#8592; Voltar
        </button>
        <h1 className="titulo-centralizado">Cadastrar Novo Empreendimento</h1>

        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-grid">
            <div className="form-group full-width-field">
              <label htmlFor="nome">Nome:</label>
              <input type="text" id="nome" name="nome" value={formData.nome} onChange={handleChange} required />
            </div>

            <div className="form-group full-width-field">
              <label htmlFor="construtora">Construtora:</label>
              <input type="text" id="construtora" name="construtora" value={formData.construtora} onChange={handleChange} />
            </div>

            <div className="form-group full-width-field">
              <label htmlFor="anexos">Anexos (Imagem):</label>
              <input type="file" id="anexos" name="anexos" accept="image/*" onChange={handleChange} />
            </div>

            <h2 className="form-section-title">Endereço</h2>

            <div className="form-group">
              <label htmlFor="estado">Estado:</label>
              <select id="estado" name="estado" value={formData.estado} onChange={handleChange} required>
                <option value="">Selecione o Estado</option>
                {estados.map((estado) => (
                  <option key={estado} value={estado}>{estado}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="cidade">Cidade:</label>
              <select
                id="cidade"
                name="cidade"
                value={formData.cidade}
                onChange={handleChange}
                required
                disabled={!formData.estado}
              >
                <option value="">Selecione a Cidade</option>
                {formData.estado &&
                  estadosECidades[formData.estado].map((cidade) => (
                    <option key={cidade} value={cidade}>{cidade}</option>
                  ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="cep">CEP:</label>
              <input type="text" id="cep" name="cep" value={formData.cep} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label htmlFor="rua">Rua:</label>
              <input type="text" id="rua" name="rua" value={formData.rua} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancelar" onClick={() => navigate('/empreendimentos')}>
              Cancelar
            </button>
            <button type="submit" className="btn-salvar">
              Salvar Empreendimento
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default CadastrarEmpreendimento;
