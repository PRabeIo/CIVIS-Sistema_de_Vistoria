import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../../Home.css';
import '../empreendimentos.css'; // Assume que empreendimentos.css ou home.css tem estilos para form-grid e form-section-title

function EditarEmpreendimento() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    // Campos da classe Empreendimento conforme o diagrama:
    nome: '',
    descricao: '',
    construtora: '',
    dataEntrega: '',
    observacoes: '',
    cidade: '',
    estado: '',
    cep: '',
    rua: '',
    // Campos de Endereço detalhados, conforme o relacionamento no diagrama:
    condominio: '',
    bloco: '',
    numero: '',
    // idEmpreendimento e idEndereco seriam IDs gerenciados pelo backend, não editáveis no form.
  });

  useEffect(() => {
    const storedEmpreendimentos = localStorage.getItem('empreendimentosMock');
    const empreendimentos = storedEmpreendimentos ? JSON.parse(storedEmpreendimentos) : [];
    const empreendimentoEncontrado = empreendimentos.find(emp => emp.id === parseInt(id));

    if (empreendimentoEncontrado) {
      // Saneamento para garantir que todos os campos são strings para evitar "controlled to uncontrolled"
      const sanitizedData = {
        nome: empreendimentoEncontrado.nome || '',
        descricao: empreendimentoEncontrado.descricao || '',
        construtora: empreendimentoEncontrado.construtora || '',
        dataEntrega: empreendimentoEncontrado.dataEntrega || '',
        observacoes: empreendimentoEncontrado.observacoes || '',
        cidade: empreendimentoEncontrado.cidade || '',
        estado: empreendimentoEncontrado.estado || '',
        cep: empreendimentoEncontrado.cep || '',
        rua: empreendimentoEncontrado.rua || '',
        condominio: empreendimentoEncontrado.condominio || '',
        bloco: empreendimentoEncontrado.bloco || '',
        numero: empreendimentoEncontrado.numero || '',
      };
      setFormData(sanitizedData);
    } else {
      alert('Empreendimento não encontrado!');
      navigate('/empreendimentos');
    }
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleUpdate = (e) => {
    e.preventDefault();

    const storedEmpreendimentos = localStorage.getItem('empreendimentosMock');
    let empreendimentos = storedEmpreendimentos ? JSON.parse(storedEmpreendimentos) : [];

    const updatedEmpreendimentos = empreendimentos.map(emp =>
      emp.id === parseInt(id) ? {
        ...formData,
        id: parseInt(id) // Mantém o ID interno, que não é editável
      } : emp
    );
    localStorage.setItem('empreendimentosMock', JSON.stringify(updatedEmpreendimentos));

    alert('Empreendimento atualizado com sucesso!');
    navigate('/empreendimentos');
  };

  const handleDelete = () => {
    if (window.confirm(`ATENÇÃO: Tem certeza que deseja EXCLUIR o empreendimento "${formData.nome}" permanentemente? Todos os imóveis associados também serão afetados.`)) {
      const confirmacaoFinal = prompt("Para confirmar a exclusão, digite 'EXCLUIR' no campo abaixo:");
      if (confirmacaoFinal === "EXCLUIR") {
        const storedEmpreendimentos = localStorage.getItem('empreendimentosMock');
        let empreendimentos = storedEmpreendimentos ? JSON.parse(storedEmpreendimentos) : [];

        const updatedEmpreendimentos = empreendimentos.filter(emp => emp.id !== parseInt(id));
        localStorage.setItem('empreendimentosMock', JSON.stringify(updatedEmpreendimentos));

        alert(`Empreendimento "${formData.nome}" excluído com sucesso!`);
        navigate('/empreendimentos');
      } else {
        alert("Exclusão cancelada ou confirmação incorreta.");
      }
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
        <button className="logout-button" onClick={() => { navigate("/login"); }}>
          Sair
        </button>
      </header>

      <main className="admin-page-container">
        <button className="back-arrow" onClick={() => navigate('/empreendimentos')} style={{ marginBottom: '20px' }}>
          &#8592; Voltar
        </button>
        <h1 style={{ marginBottom: '30px', color: '#004080' }}>Editar Empreendimento: {formData.nome}</h1>

        <form onSubmit={handleUpdate} className="form-container">
          {/* Usando form-grid para layout de duas colunas */}
          <div className="form-grid">
            <div className="form-group full-width-field">
              <label htmlFor="nome">Nome:</label>
              <input type="text" id="nome" name="nome" value={formData.nome} onChange={handleChange} required />
            </div>

            <div className="form-group full-width-field">
              <label htmlFor="descricao">Descrição:</label>
              <textarea id="descricao" name="descricao" value={formData.descricao} onChange={handleChange} rows="4"></textarea>
            </div>

            <div className="form-group">
              <label htmlFor="construtora">Construtora:</label>
              <input type="text" id="construtora" name="construtora" value={formData.construtora} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label htmlFor="dataEntrega">Data de Entrega:</label>
              <input type="date" id="dataEntrega" name="dataEntrega" value={formData.dataEntrega} onChange={handleChange} />
            </div>

            <div className="form-group full-width-field">
              <label htmlFor="observacoes">Observações:</label>
              <textarea id="observacoes" name="observacoes" value={formData.observacoes} onChange={handleChange} rows="3"></textarea>
            </div>

            {/* Subtítulo para a seção de Endereço */}
            <h2 className="form-section-title">Endereço</h2>

            <div className="form-group">
              <label htmlFor="rua">Rua:</label>
              <input type="text" id="rua" name="rua" value={formData.rua} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="numero">Número:</label>
              <input type="text" id="numero" name="numero" value={formData.numero} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="cidade">Cidade:</label>
              <input type="text" id="cidade" name="cidade" value={formData.cidade} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="estado">Estado:</label>
              <input type="text" id="estado" name="estado" value={formData.estado} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="cep">CEP:</label>
              <input type="text" id="cep" name="cep" value={formData.cep} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="condominio">Condomínio:</label>
              <input type="text" id="condominio" name="condominio" value={formData.condominio} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="bloco">Bloco:</label>
              <input type="text" id="bloco" name="bloco" value={formData.bloco} onChange={handleChange} />
            </div>
          </div> {/* Fim do form-grid */}

          <div className="form-actions">
            <button type="button" className="btn-cancelar" onClick={() => navigate('/empreendimentos')}>
              Cancelar
            </button>
            <button type="submit" className="btn-salvar">
              Atualizar Empreendimento
            </button>
            <button type="button" className="btn-excluir-form" onClick={handleDelete}>
              Excluir Empreendimento
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default EditarEmpreendimento;