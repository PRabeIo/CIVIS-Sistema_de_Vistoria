import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Funcionarios.css";
import { apiFetch } from "../../../services/api";
import Navbar from "../../components/Navbar/Navbar"; // ajuste o caminho se necessário

function Funcionarios({ onLogout }) {
  const navigate = useNavigate();
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleLogout = () => {
    if (onLogout) return onLogout();
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/login");
  };

  useEffect(() => {
    async function fetchFuncionarios() {
      try {
        const data = await apiFetch("/funcionarios", { method: "GET" });
        setFuncionarios(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Erro ao buscar funcionários:", error);
        alert("Não foi possível carregar os funcionários.");
      } finally {
        setLoading(false);
      }
    }

    fetchFuncionarios();
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

  const formatarTelefone = (tel) => {
    const original = String(tel ?? "").trim();
    if (!original) return "";

    // se já vier formatado (ex: (11) 91234-5678 ou (11) 1234-5678), retorna direto
    if (/^\(\d{2}\)\s?\d{4,5}-\d{4}$/.test(original)) return original;

    const digits = somenteDigitos(original);

    // celular (11 dígitos): (DD) 9XXXX-XXXX
    if (digits.length === 11) {
      return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }

    // fixo (10 dígitos): (DD) XXXX-XXXX
    if (digits.length === 10) {
      return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }

    // fallback: mostra como veio
    return original;
  };

  const handleExcluir = async (id, nome) => {
    if (!window.confirm(`Tem certeza que deseja excluir o funcionário(a) ${nome}?`)) return;

    const confirmacaoFinal = prompt('Para confirmar a exclusão, digite "SIM":');
    if (confirmacaoFinal !== "SIM") {
      alert("Exclusão cancelada ou confirmação incorreta.");
      return;
    }

    try {
      await apiFetch(`/funcionarios/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmacao: "SIM" }),
      });

      setFuncionarios((prev) => prev.filter((f) => f.id !== id));
      alert(`Funcionário(a) ${nome} excluído(a) com sucesso!`);
    } catch (err) {
      console.error("Erro ao excluir funcionário:", err);
      alert(err.message || "Erro ao excluir funcionário.");
    }
  };

  return (
    <div className="home-container funcionarios-page">
      <Navbar onLogout={handleLogout} />

      <main className="admin-page-container">
        <div className="admin-header">
          <h1 className="titulo-centralizado">Gestão de Funcionários</h1>

          <button
            className="admin-action-button"
            onClick={() => navigate("/cadastrar-funcionario")}
          >
            + Adicionar Funcionário
          </button>
        </div>

        {loading ? (
          <p>Carregando funcionários...</p>
        ) : funcionarios.length === 0 ? (
          <p className="sem-registros">Nenhum funcionário cadastrado.</p>
        ) : (
          <div className="table-responsive">
            <table className="lista-tabela">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Email</th>
                  <th>Telefone</th>
                  <th>Cargo</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {funcionarios.map((func) => (
                  <tr key={func.id}>
                    <td data-label="Nome">{func.nome}</td>
                    <td data-label="CPF">{formatarCPF(func.cpf)}</td>
                    <td className="mobile-hidden" data-label="Email">
                      {func.email}
                    </td>
                    <td data-label="Telefone">{formatarTelefone(func.telefone) || "-"}</td>
                    <td data-label="Cargo">{func.cargo}</td>

                    <td className="acoes-botoes" data-label="">
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
          </div>
        )}
      </main>
    </div>
  );
}

export default Funcionarios;