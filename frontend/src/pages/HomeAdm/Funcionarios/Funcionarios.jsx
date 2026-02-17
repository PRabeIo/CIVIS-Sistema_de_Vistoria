import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Funcionarios.css";
import { apiFetch } from "../../../services/api"; 

function Funcionarios() {
  const navigate = useNavigate();
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const doLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/login");
  };

  useEffect(() => {
    async function fetchFuncionarios() {
      try {
        // ✅ se você já usa apiFetch no projeto, fica assim:
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

  const handleExcluir = async (id, nome) => {
    if (!window.confirm(`Tem certeza que deseja excluir o funcionário(a) ${nome}?`)) return;

    const confirmacaoFinal = prompt('Para confirmar a exclusão, digite "SIM":');
    if (confirmacaoFinal !== "SIM") {
      alert("Exclusão cancelada ou confirmação incorreta.");
      return;
    }

    try {
      // ✅ usando apiFetch:
      await apiFetch(`/funcionarios/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmacao: "SIM" }),
      });

      // ✅ usando fetch puro (se preferir):
      // const response = await fetch(`http://localhost:3001/api/funcionarios/${id}`, {
      //   method: "DELETE",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ confirmacao: "SIM" }),
      // });
      // if (!response.ok) {
      //   const errData = await response.json();
      //   alert(`Erro: ${errData.error}`);
      //   return;
      // }

      setFuncionarios((prev) => prev.filter((f) => f.id !== id));
      alert(`Funcionário(a) ${nome} excluído(a) com sucesso!`);
    } catch (err) {
      console.error("Erro ao excluir funcionário:", err);
      alert(err.message || "Erro ao excluir funcionário.");
    }
  };

  return (
    <div className="home-container">
      {/* ✅ Navbar padrão CIVIS */}
      <header className="navbar">
        <div className="logo">CIVIS</div>

        <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
          <a href="#" onClick={() => navigate("/home")}>Home</a>
          <a href="#" onClick={() => navigate("/nova-vistoria")}>Nova Vistoria</a>
          <a href="#" onClick={() => navigate("/vistorias-agendadas")}>Vistorias Agendadas</a>
          <a href="#" onClick={() => navigate("/clientes")}>Clientes</a>
          <a href="#" onClick={() => navigate("/empreendimentos")}>Empreendimentos</a>
          <a href="#" onClick={() => navigate("/funcionarios")}>Funcionários</a>

          <button className="logout-button mobile-logout" onClick={doLogout}>Sair</button>
        </nav>

        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          ☰
        </button>

        <button className="logout-button desktop-logout" onClick={doLogout}>Sair</button>
      </header>

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
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {funcionarios.map((func) => (
                  <tr key={func.id}>
                    <td data-label="Nome">{func.nome}</td>
                    <td data-label="CPF">{func.cpf}</td>
                    <td className="mobile-hidden" data-label="Email">{func.email}</td>
                    <td data-label="Telefone">{func.telefone || "-"}</td>
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
