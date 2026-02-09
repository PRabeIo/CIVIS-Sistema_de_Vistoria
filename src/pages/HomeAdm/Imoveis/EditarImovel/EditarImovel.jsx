import React, { useState, useEffect } from 'react'; // <-- Corrigido aqui
import { useParams, useNavigate } from 'react-router-dom';
import '../../home.css'; 
import '../Imoveis.css';

// ... o restante do seu componente EditarImovel

function EditarImovel() {
  const { id } = useParams(); // Pega o ID do imóvel da URL
  const navigate = useNavigate();

    // variaveis pra armazenar os dados q foram editados
  const [formData, setFormData] = useState({
    idImovel: '',
    descricao: '',
    tipo: '',
    observacao: '',
    anexos: '',
    numeroUnidade: '',
    idEmpreendimento: '',
    // idCliente: '', //nao sei quando implementar
  });

  // Carrega os dados do imóvel 
  useEffect(() => {
    const storedImoveis = localStorage.getItem('imoveisMock');
    const imoveis = storedImoveis ? JSON.parse(storedImoveis) : [];
    const imovelEncontrado = imoveis.find(imovel => imovel.id === parseInt(id));

    if (imovelEncontrado) {
      setFormData(imovelEncontrado);
    } else {
      alert('Imóvel não encontrado!');
      navigate('/imoveis'); 
    }
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleUpdate = (e) => {
    e.preventDefault();

    const storedImoveis = localStorage.getItem('imoveisMock');
    let imoveis = storedImoveis ? JSON.parse(storedImoveis) : [];

    const updatedImoveis = imoveis.map(imovel =>
      imovel.id === parseInt(id) ? { ...formData, id: parseInt(id), idImovel: parseInt(formData.idImovel) || parseInt(id), idEmpreendimento: parseInt(formData.idEmpreendimento) || null } : imovel
    );
    localStorage.setItem('imoveisMock', JSON.stringify(updatedImoveis));

    alert('Imóvel atualizado com sucesso!');
    navigate('/imoveis');
  };

  const handleDelete = () => {
    if (window.confirm(`ATENÇÃO: Tem certeza que deseja EXCLUIR o imóvel "${formData.descricao}" permanentemente? Esta ação não pode ser desfeita.`)) {
      const confirmacaoFinal = prompt("Para confirmar a exclusão, digite 'EXCLUIR' no campo abaixo:");
      if (confirmacaoFinal === "EXCLUIR") {
        const storedImoveis = localStorage.getItem('imoveisMock');
        let imoveis = storedImoveis ? JSON.parse(storedImoveis) : [];

        const updatedImoveis = imoveis.filter(imovel => imovel.id !== parseInt(id));
        localStorage.setItem('imoveisMock', JSON.stringify(updatedImoveis));

        alert(`Imóvel "${formData.descricao}" excluído(a) com sucesso!`);
        navigate('/imoveis');
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
          <a href="#" onClick={() => navigate("/nova-vistoria")}>Nova Vistoria</a>
          <a href="#" onClick={() => navigate("/vistorias-agendadas")}>Vistorias Agendadas</a>
          <a href="#" onClick={() => navigate("/clientes")}>Clientes</a>
          <a href="#" onClick={() => navigate("/empreendimentos")}>Empreendimentos</a>
          <a href="#" onClick={() => navigate("/funcionarios")}>Funcionários</a>
        </nav>
        <button className="logout-button" onClick={() => {navigate("/login"); }}>
          Sair
        </button>
      </header>

      <main className="admin-page-container">
        <button className="back-arrow" onClick={() => navigate('/imoveis')} style={{ marginBottom: '20px' }}>
          &#8592; Voltar
        </button>
        <h1 style={{ marginBottom: '30px', color: '#004080' }}>Editar Imóvel: {formData.descricao}</h1>

        <form onSubmit={handleUpdate} className="form-container">
          <div className="form-group">
            <label htmlFor="idImovel">ID do Imóvel:</label>
            <input
              type="number"
              id="idImovel"
              name="idImovel"
              value={formData.idImovel}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="descricao">Descrição:</label>
            <input
              type="text"
              id="descricao"
              name="descricao"
              value={formData.descricao}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="tipo">Tipo:</label>
            <select
              id="tipo"
              name="tipo"
              value={formData.tipo}
              onChange={handleChange}
              required
            >
              <option value="">Selecione o Tipo</option>
              <option value="Apartamento">Apartamento</option>
              <option value="Casa">Casa</option>
              <option value="Comercial">Comercial</option>
              <option value="Terreno">Terreno</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="observacao">Observação:</label>
            <textarea
              id="observacao"
              name="observacao"
              value={formData.observacao}
              onChange={handleChange}
              rows="3"
            ></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="anexos">Anexos (URL/Caminho):</label>
            <input
              type="text"
              id="anexos"
              name="anexos"
              value={formData.anexos}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="numeroUnidade">Número da Unidade:</label>
            <input
              type="text"
              id="numeroUnidade"
              name="numeroUnidade"
              value={formData.numeroUnidade}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="idEmpreendimento">ID do Empreendimento:</label>
            <input
              type="number"
              id="idEmpreendimento"
              name="idEmpreendimento"
              value={formData.idEmpreendimento}
              onChange={handleChange}
              required
            />
          </div>


          <div className="form-actions">
            <button type="button" className="btn-cancelar" onClick={() => navigate('/imoveis')}>
              Cancelar
            </button>
            <button type="submit" className="btn-salvar">
              Atualizar Imóvel
            </button>
            <button type="button" className="btn-excluir-form" onClick={handleDelete}>
              Excluir Imóvel
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default EditarImovel;