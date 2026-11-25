import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { apiFetch } from "../../../services/api";
import "../../styles/vistoriaDetalhes.css";
import { SERVER_URL } from "../../../config";

function VistoriaDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [vistoriaDetalhes, setVistoriaDetalhes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatorioUrl, setRelatorioUrl] = useState(null);

  // formatadores (iguais)
  const somenteDigitos = (v) => String(v ?? "").replace(/\D/g, "");

  const formatarCPF = (cpf) => {
    const digits = somenteDigitos(cpf);
    if (!digits) return "";
    if (digits.length !== 11) return String(cpf);
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const formatarCEP = (cep) => {
    const digits = somenteDigitos(cep);
    if (!digits) return "";
    if (digits.length !== 8) return String(cep);
    return digits.replace(/(\d{5})(\d{3})/, "$1-$2");
  };

  const formatarDataHoraBR = (iso) => {
    if (!iso) return "N/A";
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
    const fetchVistoria = async () => {
      try {
        const data = await apiFetch(`/vistorias/${id}`, { method: "GET" });
        setVistoriaDetalhes(data);

        const urlFromState = location.state?.url || null;
        const urlFromDb = data?.relatorio_url || null;
        setRelatorioUrl(urlFromState || urlFromDb);
      } catch (err) {
        console.error("Erro ao carregar detalhes da vistoria:", err);

        if (String(err.message).toLowerCase().includes("token")) {
          alert("Sessão expirada. Faça login novamente.");
          localStorage.removeItem("token");
          localStorage.removeItem("usuario");
          navigate("/login");
          return;
        }

        alert(err.message || "Erro ao carregar detalhes da vistoria.");
        navigate("/home-cliente");
      } finally {
        setLoading(false);
      }
    };

    fetchVistoria();
  }, [id, location.state, navigate]);

  if (loading) return <div>Carregando vistoria...</div>;
  if (!vistoriaDetalhes) return <div>Vistoria não encontrada.</div>;

  const status = (vistoriaDetalhes.status || "").trim();

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

  const vistoriadorTexto =
    vistoriaDetalhes.nomevistoriador ||
    (vistoriaDetalhes.idvistoriador ? `ID ${vistoriaDetalhes.idvistoriador}` : "Não atribuído");

  //  Datas (mesma lógica do vistoriador: label + valor)
  let labelData = "Data Agendada:";
  let valorData = formatarDataHoraBR(vistoriaDetalhes.dataagendada);

  if (vistoriaDetalhes.datahorainicio) {
    labelData = "Data de Início:";
    valorData = formatarDataHoraBR(vistoriaDetalhes.datahorainicio);
  }

  if (vistoriaDetalhes.datahorafim) {
    labelData = "Data de Conclusão:";
    valorData = formatarDataHoraBR(vistoriaDetalhes.datahorafim);
  }

  //  regra do cliente: se aguardando agendamento, não mostra data
  const ocultarCampoDataAgendada = status === "Aguardando Agendamento da Vistoria";
  const podeMostrarData = !(ocultarCampoDataAgendada && !vistoriaDetalhes.datahorainicio);

  return (
    <div className="home-container vistoria-detalhes-page">
      <div className="vistoria-card">
        <h1>
          {vistoriaDetalhes.nomeempreendimento || `Detalhes da Vistoria ID: ${id}`}
        </h1>

        {vistoriaDetalhes.anexos && (
          <img
            src={`${SERVER_URL}/uploads/${vistoriaDetalhes.anexos}`}
            alt="Imagem do Imóvel"
            className="imagem-empreendimento"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}

        {}
        <div className="status-top">
          <span className={`status-badge ${statusBadgeClass}`}>
            <span className="status-dot" />
            {status || "Indefinido"}
          </span>
        </div>

        {relatorioUrl && (
          <div className="relatorio-actions">
            <a
              href={relatorioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--primary"
            >
              Visualizar Relatório
            </a>
          </div>
        )}

        <div className="vistoria-form">
          <div className="info-line">
            <span className="label">Cliente:</span>
            <span className="value">
              {vistoriaDetalhes.nomecliente || ""} [
              {formatarCPF(vistoriaDetalhes.cpfcliente) || ""}
              ]
            </span>
          </div>

          <div className="info-line">
            <span className="label">Descrição do Imóvel:</span>
            <span className="value">{vistoriaDetalhes.descricao}</span>
          </div>

          <div className="info-line">
            <span className="label">Bloco:</span>
            <span className="value">{vistoriaDetalhes.bloco}</span>
          </div>

          <div className="info-line">
            <span className="label">Número:</span>
            <span className="value">{vistoriaDetalhes.numero}</span>
          </div>

          <div className="info-line">
            <span className="label">CEP:</span>
            <span className="value">{formatarCEP(vistoriaDetalhes.cep) || ""}</span>
          </div>

          <div className="info-line">
            <span className="label">Rua:</span>
            <span className="value">{vistoriaDetalhes.rua}</span>
          </div>

          <div className="info-line">
            <span className="label">Vistoriador:</span>
            <span className="value">{vistoriadorTexto}</span>
          </div>

          {podeMostrarData && (
            <div className="info-line">
              <span className="label">{labelData}</span>
              <span className="value">{valorData}</span>
            </div>
          )}

          {vistoriaDetalhes.observacoes ? (
            <div className="info-line" style={{ gridColumn: "1 / -1" }}>
              <span className="label">Observações:</span>
              <span className="value">{vistoriaDetalhes.observacoes}</span>
            </div>
          ) : null}
        </div>

        {}
        <div className="bottom-actions">
          <button onClick={() => navigate("/home-cliente")} className="btn btn--neutral">
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}

export default VistoriaDetalhes;