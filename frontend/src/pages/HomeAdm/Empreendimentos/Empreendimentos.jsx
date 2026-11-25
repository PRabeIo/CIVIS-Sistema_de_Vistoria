import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Empreendimentos.css";
import { apiFetch } from "../../../services/api";
import Navbar from "../../components/Navbar/Navbar"; // ajuste o caminho se necessário
import { SERVER_URL } from "../../../config";

function Empreendimentos({ onLogout }) {
  const navigate = useNavigate();
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleLogout = () => {
    if (onLogout) return onLogout();
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/login");
  };

  useEffect(() => {
    const fetchEmpreendimentos = async () => {
      try {
        const data = await apiFetch("/empreendimentos");
        setEmpreendimentos(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erro ao buscar empreendimentos:", err);
        alert(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEmpreendimentos();
  }, []);

  const handleExcluir = async (id, nome) => {
    if (!window.confirm(`Tem certeza que deseja excluir o empreendimento "${nome}"?`)) return;

    try {
      await apiFetch(`/empreendimentos/${id}`, { method: "DELETE" });
      setEmpreendimentos((prev) => prev.filter((e) => e.idempreendimento !== id));
      alert(`Empreendimento "${nome}" excluído com sucesso!`);
    } catch (err) {
      console.error("Erro ao excluir:", err);
      alert(err.message);
    }
  };

  // Helper pra evitar quebrar se mudar o nome do campo no backend
  const getImg = (emp) => emp?.anexos ?? emp?.imagemempreendimento ?? emp?.imagem ?? null;
  const BASE_UPLOAD_URL = `${SERVER_URL}/uploads`;

  const buildImgUrl = (imgPath) => {
    if (!imgPath) return "/imagens/vistoria.png";

    // se já vier com "http..." retorna direto
    if (String(imgPath).startsWith("http")) return imgPath;

    // se vier com "/uploads/..." normaliza
    if (String(imgPath).startsWith("/uploads/")) return `${SERVER_URL}${imgPath}`;

    // se vier com subpasta tipo "empreendimentos/arquivo.png" ou só "arquivo.png"
    const clean = String(imgPath).replace(/^\/+/, "");
    return `${BASE_UPLOAD_URL}/empreendimentos/${clean}`;
  };

  return (
    <div className="home-container empreendimentos-page">
      <Navbar onLogout={handleLogout} />

      <main className="admin-page-container">
        <div className="admin-header">
          <h1 className="titulo-centralizado">Gestão de Empreendimentos</h1>
          <button
            className="admin-action-button"
            onClick={() => navigate("/cadastrar-empreendimento")}
          >
            Adicionar Empreendimento
          </button>
        </div>

        {loading ? (
          <p>Carregando empreendimentos...</p>
        ) : empreendimentos.length === 0 ? (
          <p className="sem-registros">Nenhum empreendimento cadastrado.</p>
        ) : (
          <div className="table-responsive">
            <table className="lista-tabela">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Construtora</th>
                  <th className="mobile-hidden">Endereço</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {empreendimentos.map((emp) => {
                  const img = getImg(emp);
                  const imgUrl = buildImgUrl(img);

                  return (
                    <tr key={emp.idempreendimento}>
                      <td data-label="Nome">
                        <div className="emp-nome-wrapper">
                          <div className="emp-nome-text">{emp.nome}</div>
                          <div
                            className="emp-thumb"
                            style={{ backgroundImage: `url(${imgUrl})` }}
                            aria-label={`Imagem do empreendimento ${emp.nome}`}
                          />
                        </div>
                      </td>

                      <td data-label="Construtora">{emp.construtora || "-"}</td>

                      <td className="mobile-hidden" data-label="Endereço">
                        {emp.rua || "-"}, {emp.cidade || "-"} / {emp.estado || "-"} -{" "}
                        {emp.cep || "-"}
                      </td>

                      <td data-label="Ações">
                        <div className="acoes-botoes">
                          <button
                            className="btn-ver-imoveis"
                            onClick={() =>
                              navigate(`/imoveis?empreendimentoid=${emp.idempreendimento}`)
                            }
                          >
                            Exibir Imóveis
                          </button>

                          <button
                            className="btn-excluir"
                            onClick={() => handleExcluir(emp.idempreendimento, emp.nome)}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default Empreendimentos;