import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Clientes.css";
import { apiFetch } from "../../../services/api";
import Navbar from "../../components/Navbar/Navbar"; 

function Clientes({ onLogout }) {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleLogout = () => {
    if (onLogout) return onLogout();
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/login");
  };

  useEffect(() => {
    async function fetchClientes() {
      try {
        const data = await apiFetch("/clientes", { method: "GET" });
        setClientes(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Erro ao buscar clientes:", error);
        alert("Não foi possível carregar os clientes.");
      } finally {
        setLoading(false);
      }
    }

    fetchClientes();
  }, []);

  const somenteDigitos = (v) => String(v ?? "").replace(/\D/g, "");

  const formatarCPF = (cpf) => {
    const original = String(cpf ?? "").trim();
    if (!original) return "";

    if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(original)) return original;

    const digits = somenteDigitos(original);
    if (digits.length === 11) {
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    return original;
  };

  const formatarTelefone = (tel) => {
    const original = String(tel ?? "").trim();
    if (!original) return "";

    if (/^\(\d{2}\)\s?\d{4,5}-\d{4}$/.test(original)) return original;

    const digits = somenteDigitos(original);

    // se vier com DDI 55 (ex: 5511999999999), remove
    const d = digits.length === 13 && digits.startsWith("55") ? digits.slice(2) : digits;

    if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");

    return original;
  };

  const handleExcluir = async (id, nome) => {
    if (!window.confirm(`Tem certeza que deseja excluir o cliente ${nome}?`)) return;

    const confirmacaoFinal = prompt('Para confirmar a exclusão, digite "SIM":');
    if (confirmacaoFinal !== "SIM") {
      alert("Exclusão cancelada ou confirmação incorreta.");
      return;
    }

    try {
      await apiFetch(`/clientes/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmacao: "SIM" }),
      });

      setClientes((prev) => prev.filter((c) => c.id !== id));
      alert(`Cliente ${nome} excluído(a) com sucesso!`);
    } catch (err) {
      console.error("Erro ao excluir cliente:", err);
      alert(err.message || "Erro ao excluir cliente.");
    }
  };

  return (
    <div className="home-container clientes-page">
      <Navbar onLogout={handleLogout} />

      <main className="admin-page-container">
        <div className="admin-header">
          <h1 className="titulo-centralizado">Gestão de Clientes</h1>

          <button
            className="admin-action-button"
            onClick={() => navigate("/cadastrar-cliente")}
          >
            + Adicionar Cliente
          </button>
        </div>

        {loading ? (
          <p>Carregando clientes...</p>
        ) : clientes.length === 0 ? (
          <p className="sem-registros">Nenhum cliente cadastrado.</p>
        ) : (
          <div className="table-responsive">
            <table className="lista-tabela">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Email</th>
                  <th>Telefone</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {clientes.map((cli) => (
                  <tr key={cli.id}>
                    <td data-label="Nome">{cli.nome}</td>
                    <td data-label="CPF">{formatarCPF(cli.cpf)}</td>
                    <td className="mobile-hidden" data-label="Email">
                      {cli.email}
                    </td>
                    <td data-label="Telefone">{formatarTelefone(cli.telefone) || "-"}</td>

                    <td className="acoes-botoes" data-label="">
                      <button
                        className="btn-editar"
                        onClick={() => navigate(`/editar-cliente/${cli.id}`)}
                      >
                        Editar
                      </button>

                      <button
                        className="btn-excluir"
                        onClick={() => handleExcluir(cli.id, cli.nome)}
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

export default Clientes;