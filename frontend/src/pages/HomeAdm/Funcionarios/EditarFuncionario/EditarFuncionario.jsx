import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../../../styles/cadastro.css";
import Navbar from "../../../components/Navbar/Navbar";
import { apiFetch } from "../../../../services/api";
import { mascararCpf, mascararTelefone } from "../../../../utils/mascaras";

// B3: usa apiFetch (sessão + erros padronizados) e a Navbar padrão (B8).
// S8: o backend recusa rebaixar a si mesmo ou o último admin; a mensagem aparece no alerta.
function EditarFuncionario() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [formData, setFormData] = useState({
    nome: "",
    cpf: "",
    email: "",
    senha: "",
    confirmarSenha: "",
    telefone: "",
    cargo: "",
  });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    apiFetch(`/funcionarios/${id}`)
      .then((data) =>
        setFormData((prev) => ({
          ...prev,
          nome: data.nome || "",
          cpf: mascararCpf(data.cpf),
          email: data.email || "",
          telefone: mascararTelefone(data.telefone),
          cargo: data.cargo || "",
        })),
      )
      .catch((err) => {
        alert(err.message || "Funcionário não encontrado.");
        navigate("/funcionarios");
      });
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const valor = name === "cpf" ? mascararCpf(value) : name === "telefone" ? mascararTelefone(value) : value;
    setFormData((prev) => ({ ...prev, [name]: valor }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.senha !== formData.confirmarSenha) {
      alert("As senhas não coincidem!");
      return;
    }

    setSalvando(true);
    try {
      await apiFetch(`/funcionarios/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          nome: formData.nome,
          cpf: formData.cpf,
          email: formData.email,
          telefone: formData.telefone,
          cargo: formData.cargo,
          senha: formData.senha, // "" = não alterar
        }),
      });
      alert("Funcionário atualizado com sucesso!");
      navigate("/funcionarios");
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="home-container cadastro-page">
      <Navbar />

      <main className="admin-page-container">
        <h1 className="titulo-centralizado">Editar Funcionário</h1>

        <form onSubmit={handleSubmit} className="cadastro-form">
          <div className="cadastro-group">
            <label htmlFor="nome">Nome Completo:</label>
            <input type="text" id="nome" name="nome" value={formData.nome} onChange={handleChange} required />
          </div>
          <div className="cadastro-group">
            <label htmlFor="cpf">CPF:</label>
            <input type="text" id="cpf" name="cpf" value={formData.cpf} onChange={handleChange} required />
          </div>
          <div className="cadastro-group">
            <label htmlFor="email">Email:</label>
            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
          </div>
          <div className="cadastro-group">
            <label htmlFor="telefone">Telefone:</label>
            <input type="tel" id="telefone" name="telefone" value={formData.telefone} onChange={handleChange} />
          </div>
          <div className="cadastro-group">
            <label htmlFor="cargo">Cargo:</label>
            <select id="cargo" name="cargo" value={formData.cargo} onChange={handleChange} required>
              <option value="">Selecione</option>
              <option value="Administrador">Administrador</option>
              <option value="Vistoriador">Vistoriador</option>
            </select>
          </div>
          <div className="cadastro-group">
            <label htmlFor="senha">Nova senha (opcional):</label>
            <input
              type="password"
              id="senha"
              name="senha"
              value={formData.senha}
              onChange={handleChange}
              autoComplete="new-password"
            />
            <small className="cadastro-hint">Deixe em branco para manter a senha atual.</small>
          </div>
          <div className="cadastro-group">
            <label htmlFor="confirmarSenha">Confirmar nova senha:</label>
            <input
              type="password"
              id="confirmarSenha"
              name="confirmarSenha"
              value={formData.confirmarSenha}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>

          <div className="cadastro-actions">
            <button type="button" className="cadastro-btn cadastro-btn--cancelar" onClick={() => navigate("/funcionarios")}>
              Cancelar
            </button>
            <button type="submit" className="cadastro-btn cadastro-btn--salvar" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default EditarFuncionario;
