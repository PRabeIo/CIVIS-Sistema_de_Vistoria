import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./CadastrarImovel.css";
import { apiFetch, logoutNoServidor } from "../../../../services/api"; // ajuste o caminho se necessário
import Navbar from "../../../components/Navbar/Navbar"; // ajuste o caminho se necessário

function CadastrarImovel({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const empreendimentoid = new URLSearchParams(location.search).get("empreendimentoid");

  const [clientes, setClientes] = useState([]);
  const [formData, setFormData] = useState({
    idcliente: "",
    descricao: "",
    bloco: "",
    numero: "",
  });

  const handleLogout = () => {
    if (onLogout) return onLogout();
    logoutNoServidor();
    localStorage.removeItem("usuario");
    navigate("/login");
  };

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const data = await apiFetch("/clientes", { method: "GET" });
        setClientes(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Erro ao buscar clientes:", error);
        alert(error.message || "Erro ao buscar clientes.");
      }
    };
    fetchClientes();
  }, []);

  const somenteDigitos = (v) => String(v ?? "").replace(/\D/g, "");

  const formatarCPF = (cpf) => {
    const original = String(cpf ?? "").trim();
    if (!original) return "";

    // se já está no formato 000.000.000-00, só retorna
    if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(original)) return original;

    // tenta mascarar se tiver 11 dígitos
    const digits = somenteDigitos(original);
    if (digits.length === 11) {
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }

    // fallback: mostra como veio (pra não quebrar dados inesperados)
    return original;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!empreendimentoid) {
      alert("Empreendimento ID não encontrado na URL.");
      return;
    }

    const payload = {
      ...formData,
      idempreendimento: Number(empreendimentoid),
    };

    try {
      await apiFetch("/imoveis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      alert("Imóvel cadastrado com sucesso!");
      navigate(`/imoveis?empreendimentoid=${empreendimentoid}`);
    } catch (error) {
      console.error("Erro ao cadastrar imóvel:", error);
      alert(error.message || "Erro ao cadastrar imóvel.");
    }
  };

  return (
    <div className="home-container cadastrar-imovel-page">
      <Navbar onLogout={handleLogout} />

      <main className="admin-page-container">
        <h1 className="titulo-centralizado">Cadastrar Imóvel</h1>

        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-grid">
            <div className="form-group full-width-field">
              <label htmlFor="idcliente">Cliente:</label>
              <select
                id="idcliente"
                name="idcliente"
                value={formData.idcliente}
                onChange={handleChange}
                required
              >
                <option value="">Selecione um cliente</option>
                {clientes.map((c) => (
                  <option key={c.idcliente} value={c.idcliente}>
                    {c.nome} - {formatarCPF(c.cpf)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group full-width-field">
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
              <label htmlFor="bloco">Bloco:</label>
              <input
                type="text"
                id="bloco"
                name="bloco"
                value={formData.bloco}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="numero">Número:</label>
              <input
                type="text"
                id="numero"
                name="numero"
                value={formData.numero}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-cancelar"
              onClick={() => navigate(`/imoveis?empreendimentoid=${empreendimentoid}`)}
            >
              Cancelar
            </button>

            <button type="submit" className="btn-salvar">
              Criar Imóvel
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default CadastrarImovel;