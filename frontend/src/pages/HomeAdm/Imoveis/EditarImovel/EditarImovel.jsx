import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../../../styles/cadastro.css";
import Navbar from "../../../components/Navbar/Navbar";
import { apiFetch } from "../../../../services/api";

// Antes esta tela lia e gravava um mock no localStorage (nunca falava com a API).
// Agora: GET/PUT/DELETE /imoveis/:id. A exclusão é recusada pelo backend se houver
// vistoria em andamento ou já realizada (B6).
function EditarImovel() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [imovel, setImovel] = useState(null);
  const [formData, setFormData] = useState({ descricao: "", bloco: "", numero: "" });
  const [salvando, setSalvando] = useState(false);

  const voltar = () =>
    navigate(imovel?.idempreendimento ? `/imoveis?empreendimentoid=${imovel.idempreendimento}` : "/empreendimentos");

  useEffect(() => {
    apiFetch(`/imoveis/${id}`)
      .then((data) => {
        setImovel(data);
        setFormData({ descricao: data.descricao || "", bloco: data.bloco || "", numero: data.numero || "" });
      })
      .catch((err) => {
        alert(err.message || "Imóvel não encontrado.");
        navigate("/empreendimentos");
      });
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await apiFetch(`/imoveis/${id}`, { method: "PUT", body: JSON.stringify(formData) });
      alert("Imóvel atualizado com sucesso!");
      voltar();
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Tem certeza que deseja EXCLUIR o imóvel "${formData.descricao}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    try {
      await apiFetch(`/imoveis/${id}`, { method: "DELETE" });
      alert("Imóvel excluído com sucesso.");
      voltar();
    } catch (err) {
      alert(err.message);
    }
  };

  if (!imovel) {
    return (
      <div className="home-container cadastro-page">
        <Navbar />
        <main className="admin-page-container">
          <p>Carregando imóvel...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="home-container cadastro-page">
      <Navbar />

      <main className="admin-page-container">
        <h1 className="titulo-centralizado">Editar Imóvel</h1>

        <form onSubmit={handleUpdate} className="cadastro-form">
          <div className="cadastro-group">
            <label>Empreendimento:</label>
            <input type="text" value={imovel.nomeempreendimento || "-"} disabled />
          </div>
          <div className="cadastro-group">
            <label>Cliente:</label>
            <input type="text" value={imovel.nomecliente || "-"} disabled />
          </div>
          <div className="cadastro-group">
            <label htmlFor="descricao">Descrição:</label>
            <input id="descricao" name="descricao" value={formData.descricao} onChange={handleChange} required />
          </div>
          <div className="cadastro-group">
            <label htmlFor="bloco">Bloco:</label>
            <input id="bloco" name="bloco" value={formData.bloco} onChange={handleChange} />
          </div>
          <div className="cadastro-group">
            <label htmlFor="numero">Número da unidade:</label>
            <input id="numero" name="numero" value={formData.numero} onChange={handleChange} required />
          </div>

          <div className="cadastro-actions">
            <button type="button" className="cadastro-btn cadastro-btn--cancelar" onClick={voltar}>
              Cancelar
            </button>
            <button type="button" className="cadastro-btn cadastro-btn--cancelar" onClick={handleDelete}>
              Excluir
            </button>
            <button type="submit" className="cadastro-btn cadastro-btn--salvar" disabled={salvando}>
              {salvando ? "Salvando..." : "Atualizar Imóvel"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default EditarImovel;
