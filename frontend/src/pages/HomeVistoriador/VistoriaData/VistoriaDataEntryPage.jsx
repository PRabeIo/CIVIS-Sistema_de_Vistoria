// src/pages/HomeVistoriador/VistoriaData/VistoriaDataEntryPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { apiFetch } from "../../../services/api";
import "../../styles/vistoriaDetalhes.css";
import { SERVER_URL } from "../../../config";

function VistoriaDataEntryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [vistoriaDetalhes, setVistoriaDetalhes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatorioUrl, setRelatorioUrl] = useState(null);

  const isCliente = location.pathname.includes("/cliente/");

  useEffect(() => {
    const fetchVistoria = async () => {
      try {
        const data = await apiFetch(`/vistorias/${id}`, { method: "GET" });
        setVistoriaDetalhes(data);

        // prioridade: URL vindo do navigate (state.url), senão do banco (data.relatorio_url)
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
      } finally {
        setLoading(false);
      }
    };

    fetchVistoria();
  }, [id, location.state, navigate]);

  // ✅ ADICIONADO: formatadores (não muda mais nada do código)
  const somenteDigitos = (v) => String(v ?? "").replace(/\D/g, "");

  const formatarCPF = (cpf) => {
    const digits = somenteDigitos(cpf);
    if (!digits) return "";
    if (digits.length !== 11) return String(cpf); // se vier estranho, mostra como veio
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const formatarCEP = (cep) => {
    const digits = somenteDigitos(cep);
    if (!digits) return "";
    if (digits.length !== 8) return String(cep); // se vier estranho, mostra como veio
    return digits.replace(/(\d{5})(\d{3})/, "$1-$2");
  };

  const handleIniciarVistoria = async () => {
    try {
      const status = (vistoriaDetalhes?.status || "").trim();

      // Se já está em andamento, não chama backend: só continua fluxo
      if (status === "Em Andamento") {
        navigate(`/vistoriador/iniciar-vistoria-detalhes/${id}`);
        return;
      }

      // Só chama /iniciar se estiver agendada/reagendada
      if (status === "Vistoria Agendada" || status === "Vistoria Reagendada") {
        await apiFetch(`/vistorias/${id}/iniciar`, { method: "PUT" });
        navigate(`/vistoriador/iniciar-vistoria-detalhes/${id}`);
        return;
      }

      alert(`Não é possível iniciar/continuar. Status atual: ${status || "Indefinido"}`);
    } catch (err) {
      console.error("Erro ao iniciar/continuar a vistoria:", err);
      alert(err.message || "Erro ao iniciar/continuar a vistoria.");
    }
  };

  const handleFinalizarVistoria = async () => {
    try {
      await apiFetch(`/vistorias/${id}/finalizar`, { method: "PUT" });

      alert("Vistoria finalizada com sucesso!");

      // recarrega a página para já mostrar Data de Conclusão e remover botões
      const data = await apiFetch(`/vistorias/${id}`, { method: "GET" });
      setVistoriaDetalhes(data);
    } catch (err) {
      console.error("Erro ao finalizar a vistoria:", err);

      if (String(err.message).toLowerCase().includes("token")) {
        alert("Sessão expirada. Faça login novamente.");
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        navigate("/login");
        return;
      }

      alert(err.message || "Erro ao finalizar vistoria.");
    }
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

  if (loading) return <div>Carregando detalhes da vistoria...</div>;
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
  };
  const statusBadgeClass = statusClassMap[status] || "status--finalizada";

  const podeIniciarOuContinuar =
    status === "Vistoria Agendada" ||
    status === "Vistoria Reagendada" ||
    status === "Em Andamento";

  const labelIniciar = status === "Em Andamento" ? "Continuar Vistoria" : "Iniciar Vistoria";
  const podeFinalizar = status === "Vistoria Validada";

  const semAcoesVistoriador =
    status === "Aguardando Validação" ||
    status === "Vistoria Rejeitada" ||
    status === "Vistoria Finalizada";

  // ✅ Nome do vistoriador (igual ao cliente)
  const vistoriadorTexto =
    vistoriaDetalhes.nomevistoriador ||
    (vistoriaDetalhes.idvistoriador ? `ID ${vistoriaDetalhes.idvistoriador}` : "Não atribuído");

  // ✅ Datas (label e valor corretos)
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

  // return ( ... )
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

        {/* ✅ STATUS AGORA FICA ABAIXO DA IMAGEM */}
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
              {/* ✅ ALTERADO: aplica máscara no CPF */}
              {vistoriaDetalhes.nomecliente || ""} [{formatarCPF(vistoriaDetalhes.cpfcliente) || ""}]
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
            {/* ✅ ALTERADO: aplica máscara no CEP */}
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

          <div className="info-line">
            <span className="label">{labelData}</span>
            <span className="value">{valorData}</span>
          </div>

          {/* BOTÕES DO VISTORIADOR */}
          {!isCliente && !semAcoesVistoriador && (
            <div className="form-actions">
              {podeIniciarOuContinuar && (
                <button onClick={handleIniciarVistoria} className="btn btn--primary">
                  {labelIniciar}
                </button>
              )}

              {podeFinalizar && (
                <button onClick={handleFinalizarVistoria} className="btn btn--danger">
                  Finalizar Vistoria
                </button>
              )}
            </div>
          )}
        </div>

        <div className="bottom-actions">
          <button onClick={() => navigate("/home")} className="btn btn--neutral">
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}

export default VistoriaDataEntryPage;