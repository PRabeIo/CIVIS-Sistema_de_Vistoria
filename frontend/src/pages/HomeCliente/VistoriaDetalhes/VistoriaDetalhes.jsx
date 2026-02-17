import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { apiFetch } from "../../../services/api";
import "./VistoriaDetalhes.css";

function VistoriaDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [vistoria, setVistoria] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatorioUrl, setRelatorioUrl] = useState(null);

  // formato padrão do sistema
  const formatarDataHoraBR = (iso) => {
    if (!iso) return "Data não definida";
    const d = new Date(iso);

    const data = d.toLocaleDateString("pt-BR", {
      timeZone: "America/Fortaleza",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const hora = d.toLocaleTimeString("pt-BR", {
      timeZone: "America/Fortaleza",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    return `${data} às ${hora}`;
  };

  useEffect(() => {
    async function fetchVistoria() {
      try {
        const data = await apiFetch(`/vistorias/${id}`, { method: "GET" });

        // url relatório prioridade
        const urlFromState = location.state?.url || null;
        const urlFromDb = data?.relatorio_url || null;
        setRelatorioUrl(urlFromState || urlFromDb);

        setVistoria({
          idVistoria: data.idvistoria ?? "N/A",
          status: data.status ?? "N/A",

          nomeempreendimento: data.nomeempreendimento ?? "",
          descricao: data.descricao ?? "",
          bloco: data.bloco ?? "",
          numero: data.numero ?? "",

          cep: data.cep ?? "",
          rua: data.rua ?? "",

          nomecliente: data.nomecliente ?? "",
          cpfcliente: data.cpfcliente ?? "",

          // nome do vistoriador vindo do backend
          nomevistoriador: data.nomevistoriador ?? null,
          idvistoriador: data.idvistoriador ?? null,

          dataagendada: data.dataagendada ?? null,
          datahorainicio: data.datahorainicio ?? null,
          datahorafim: data.datahorafim ?? null,

          observacoes: data.observacoes ?? "Nenhuma",
          anexos: data.anexos ?? null,
        });
      } catch (err) {
        console.error("Erro ao buscar vistoria:", err);

        if (String(err.message).toLowerCase().includes("token")) {
          alert("Sessão expirada. Faça login novamente.");
          localStorage.removeItem("token");
          localStorage.removeItem("usuario");
          navigate("/login");
          return;
        }

        alert(err.message || "Vistoria não encontrada.");
        navigate("/home-cliente");
      } finally {
        setLoading(false);
      }
    }

    fetchVistoria();
  }, [id, location.state, navigate]);

  if (loading) return <div>Carregando vistoria...</div>;
  if (!vistoria) return <div>Vistoria não encontrada.</div>;

  const status = (vistoria.status || "").trim();

  const statusClassMap = {
    "Vistoria Agendada": "status--agendada",
    "Vistoria Reagendada": "status--reagendada",
    "Em Andamento": "status--andamento",
    "Aguardando Validação": "status--aguardando-validacao",
    "Vistoria Validada": "status--validada",
    "Vistoria Rejeitada": "status--rejeitada",
    "Vistoria Finalizada": "status--finalizada",
    "Aguardando Agendamento da Vistoria": "status--aguardando-agendamento",
  };

  const statusBadgeClass = statusClassMap[status] || "status--finalizada";

  const imgUrl = vistoria.anexos
    ? `http://localhost:3001/uploads/${vistoria.anexos}`
    : null;

  const vistoriadorTexto =
    vistoria.nomevistoriador ||
    (vistoria.idvistoriador ? `ID ${vistoria.idvistoriador}` : "Não atribuído");

  // ✅ regra: se estiver aguardando agendamento, não mostra campo de data agendada
  const ocultarCampoDataAgendada = status === "Aguardando Agendamento da Vistoria";

  return (
    <div className="vistoria-detalhes-container">
      <h1>{vistoria.nomeempreendimento}</h1>

      {imgUrl && (
        <img
          src={imgUrl}
          alt="Empreendimento"
          className="imagem-empreendimento"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      )}

      {/* botão relatório alinhado esquerda */}
      {relatorioUrl && (
        <div className="relatorio-actions">
          <a
            href={relatorioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="visualizar-relatorio-btn"
          >
            Visualizar Relatório
          </a>
        </div>
      )}

      <div className="vistoria-form">
        <div className="info-line">
          <span className="label">Cliente:</span>
          <span className="value">
            {vistoria.nomecliente} {vistoria.cpfcliente ? `[${vistoria.cpfcliente}]` : ""}
          </span>
        </div>

        <div className="info-line">
          <span className="label">Descrição do Imóvel:</span>
          <span className="value">{vistoria.descricao}</span>
        </div>

        <div className="info-line">
          <span className="label">Bloco:</span>
          <span className="value">{vistoria.bloco}</span>
        </div>

        <div className="info-line">
          <span className="label">Número:</span>
          <span className="value">{vistoria.numero}</span>
        </div>

        <div className="info-line">
          <span className="label">CEP:</span>
          <span className="value">{vistoria.cep}</span>
        </div>

        <div className="info-line">
          <span className="label">Rua:</span>
          <span className="value">{vistoria.rua}</span>
        </div>

        <div className="info-line">
          <span className="label">Status da Vistoria:</span>
          <span className={`status-badge ${statusBadgeClass}`}>{status}</span>
        </div>

        <div className="info-line">
          <span className="label">Vistoriador:</span>
          <span className="value">{vistoriadorTexto}</span>
        </div>

        {/* ✅ Datas */}
        {!vistoria.datahorainicio ? (
          // ainda não iniciou
          !ocultarCampoDataAgendada ? (
            <div className="info-line">
              <span className="label">Data Agendada:</span>
              <span className="value">
                {vistoria.dataagendada
                  ? formatarDataHoraBR(vistoria.dataagendada)
                  : "Data não definida"}
              </span>
            </div>
          ) : null
        ) : (
          // já iniciou
          <>
            <div className="info-line">
              <span className="label">Data de Início:</span>
              <span className="value">{formatarDataHoraBR(vistoria.datahorainicio)}</span>
            </div>

            {vistoria.datahorafim && (
              <div className="info-line">
                <span className="label">Data de Conclusão:</span>
                <span className="value">{formatarDataHoraBR(vistoria.datahorafim)}</span>
              </div>
            )}
          </>
        )}

        <div className="info-line">
          <span className="label">Observações:</span>
          <span className="value">{vistoria.observacoes}</span>
        </div>
      </div>

      {/* botão voltar embaixo */}
      <div className="botao-voltar-container">
        <button onClick={() => navigate("/home-cliente")} className="back-to-list-button">
          Voltar
        </button>
      </div>
    </div>
  );
}

export default VistoriaDetalhes;
