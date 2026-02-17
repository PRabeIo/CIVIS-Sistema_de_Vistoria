import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../home.css";
import "./Imoveis.css";
import { apiFetch } from "../../../services/api"; // ajuste se necessário

function ListagemImoveis() {
  const navigate = useNavigate();
  const location = useLocation();

  const empreendimentoid = new URLSearchParams(location.search).get("empreendimentoid");

  const [menuOpen, setMenuOpen] = useState(false);
  const [imoveis, setImoveis] = useState([]);
  const [empreendimentoNome, setEmpreendimentoNome] = useState("");
  const [loading, setLoading] = useState(true);

  const doLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/login");
  };

  // Buscar o nome do empreendimento
  useEffect(() => {
    const fetchEmpreendimento = async () => {
      try {
        if (!empreendimentoid) return;
        const data = await apiFetch(`/empreendimentos/${empreendimentoid}`, { method: "GET" });
        setEmpreendimentoNome(data?.nome ?? "Desconhecido");
      } catch (err) {
        console.error("Erro ao buscar nome do empreendimento:", err);
        setEmpreendimentoNome("Desconhecido");
      }
    };

    fetchEmpreendimento();
  }, [empreendimentoid]);

  // Buscar imóveis
  useEffect(() => {
    const fetchImoveis = async () => {
      try {
        if (!empreendimentoid) return;

        const data = await apiFetch(`/empreendimentos/${empreendimentoid}/imoveis`, { method: "GET" });
        setImoveis(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erro ao buscar imóveis:", err);
        alert(err.message || "Erro ao buscar imóveis.");
      } finally {
        setLoading(false);
      }
    };

    fetchImoveis();
  }, [empreendimentoid]);

  // Mantém "Excluir" por agora (depois você troca pra PATCH e faz soft delete)
  const handleExcluir = async (id, descricao) => {
    if (!window.confirm(`Tem certeza que deseja excluir o imóvel "${descricao}"?`)) return;

    try {
      // HOJE: se existir DELETE
      await apiFetch(`/imoveis/${id}`, { method: "DELETE" });

      // AMANHÃ (soft delete): você troca por algo assim:
      // await apiFetch(`/imoveis/${id}`, { method: "PATCH", body: { ativo: false } });
      // ou: await apiFetch(`/imoveis/${id}/desativar`, { method: "PATCH" });

      setImoveis((prev) => prev.filter((imovel) => imovel.idimovel !== id));
      alert(`Imóvel "${descricao}" excluído com sucesso.`);
    } catch (err) {
      console.error("Erro ao excluir imóvel:", err);
      alert(err.message || "Erro ao excluir imóvel.");
    }
  };

  const badgeClass = (status) => {
    const s = String(status || "").toLowerCase();
    if (s.includes("ativo") || s.includes("dispon")) return "badge badge-ok";
    if (s.includes("vist") || s.includes("andamento")) return "badge badge-warn";
    if (s.includes("inativ") || s.includes("bloq")) return "badge badge-bad";
    return "badge";
  };

  return (
    <div className="home-container">
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

        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
        <button className="logout-button desktop-logout" onClick={doLogout}>Sair</button>
      </header>

      <main className="admin-page-container">
        <div className="admin-header">
          <div className="imoveis-title-wrap">
            <h1 className="titulo-centralizado">Imóveis</h1>
            <p className="subtitulo-pagina">
              Empreendimento: <strong>{empreendimentoNome || "..."}</strong>
            </p>
          </div>

          <button
            className="admin-action-button"
            onClick={() => navigate(`/cadastrar-imovel?empreendimentoid=${empreendimentoid}`)}
          >
            Adicionar Imóvel
          </button>
        </div>

        {loading ? (
          <p>Carregando imóveis...</p>
        ) : imoveis.length === 0 ? (
          <p className="sem-registros">
            Nenhum imóvel encontrado para o empreendimento <strong>{empreendimentoNome}</strong>.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="lista-tabela">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Bloco</th>
                  <th>Número</th>
                  <th>Status</th>
                  <th>Vistorias</th>
                  <th>Observações</th>
                  <th>Ações</th>
                </tr>
              </thead>


              <tbody>
                {imoveis.map((imovel) => (
                  <tr key={imovel.idimovel}>
                    
                    <td data-label="Descrição">
                      {imovel.descricao || "-"}
                    </td>

                    <td data-label="Bloco">
                      {imovel.bloco || "-"}
                    </td>

                    <td data-label="Número">
                      {imovel.numero || "-"}
                    </td>

                    <td data-label="Status">
                      {imovel.status_vistoria || "Sem vistoria"}
                    </td>

                    <td data-label="Vistorias">
                      {imovel.vistoriasrealizadas ?? 0}
                    </td>

                    <td data-label="Observações">
                      {imovel.observacoes_vistoria || "-"}
                    </td>

                    <td className="acoes-botoes" data-label="">
    

                      <button
                        className="btn-ver-imoveis"
                        onClick={() => navigate(`/editar-imovel/${imovel.idimovel}`)}
                      >
                        Editar
                      </button>

                      <button
                        className="btn-excluir"
                        onClick={() => handleExcluir(imovel.idimovel, imovel.descricao)}
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

export default ListagemImoveis;
