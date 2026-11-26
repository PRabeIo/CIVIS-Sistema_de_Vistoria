import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Imoveis.css";
import { apiFetch, logoutNoServidor } from "../../../services/api";  
import Navbar from "../../components/Navbar/Navbar"; 

function ListagemImoveis({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const empreendimentoid = new URLSearchParams(location.search).get("empreendimentoid");

  const [imoveis, setImoveis] = useState([]);
  const [empreendimentoNome, setEmpreendimentoNome] = useState("");
  const [loading, setLoading] = useState(true);

  const handleLogout = () => {
    if (onLogout) return onLogout();
    logoutNoServidor();
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

        const data = await apiFetch(`/empreendimentos/${empreendimentoid}/imoveis`, {
          method: "GET",
        });
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
      await apiFetch(`/imoveis/${id}`, { method: "DELETE" });

      setImoveis((prev) => prev.filter((imovel) => imovel.idimovel !== id));
      alert(`Imóvel "${descricao}" excluído com sucesso.`);
    } catch (err) {
      console.error("Erro ao excluir imóvel:", err);
      alert(err.message || "Erro ao excluir imóvel.");
    }
  };

  return (
    <div className="home-container imoveis-page">
      <Navbar onLogout={handleLogout} />

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
            Nenhum imóvel encontrado para o empreendimento{" "}
            <strong>{empreendimentoNome}</strong>.
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
                    <td data-label="Descrição">{imovel.descricao || "-"}</td>

                    <td data-label="Bloco">{imovel.bloco || "-"}</td>

                    <td data-label="Número">{imovel.numero || "-"}</td>

                    <td data-label="Status">{imovel.status_vistoria || "Sem vistoria"}</td>

                    <td data-label="Vistorias">{imovel.vistoriasrealizadas ?? 0}</td>

                    <td data-label="Observações">{imovel.observacoes_vistoria || "-"}</td>

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