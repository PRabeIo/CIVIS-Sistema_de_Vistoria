import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import "./CriarRelatorioPage.css";
import { apiFetch, getToken } from "../../../services/api";

const opcoesEstado = ["Péssimo", "Ruim", "Razoável", "Bom", "Excelente"];
const comodos = ["quartos", "banheiros", "sala", "cozinha", "varanda"];

function Step({ step, currentStep }) {
  const status =
    currentStep === step ? "active" : currentStep < step ? "inactive" : "complete";

  return (
    <motion.div animate={status} className="step-wrapper">
      <motion.div
        variants={{ active: { scale: 1 }, complete: { scale: 1.25 } }}
        transition={{ duration: 0.2 }}
        className="step-bg"
      />
      <motion.div
        initial={false}
        variants={{
          inactive: { backgroundColor: "#fff", borderColor: "#ccc", color: "#999" },
          active: { backgroundColor: "#fff", borderColor: "#007bff", color: "#007bff" },
          complete: { backgroundColor: "#007bff", borderColor: "#007bff", color: "#fff" },
        }}
        transition={{ duration: 0.2 }}
        className="step-circle"
      >
        {status === "complete" ? <CheckIcon /> : <span>{step}</span>}
      </motion.div>
    </motion.div>
  );
}

function CheckIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} width="20" height="20">
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.2, type: "tween", ease: "easeOut", duration: 0.3 }}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function CriarRelatorioPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  // ✅ começa direto no primeiro cômodo (step 1)
  const [step, setStep] = useState(1);

  const [mensagem, setMensagem] = useState("");
  const [vistoriaDetalhes, setVistoriaDetalhes] = useState(null);

  const criarComodoInicial = () => ({
    Quantidade: "0",
    Estrutura: "",
    Pintura: "",
    InstalacaoEletrica: "",
    InstalacaoHidraulica: "",
    Piso: "",
    Telhado: "",
    observacoes: "",
    anexos: [],
  });

  const [form, setForm] = useState({
    idVistoria: id || "",
    comodos: {
      quartos: criarComodoInicial(),
      banheiros: criarComodoInicial(),
      sala: criarComodoInicial(),
      cozinha: criarComodoInicial(),
      varanda: criarComodoInicial(),
    },
  });

  const [previewURLs, setPreviewURLs] = useState({});

  useEffect(() => {
    const carregarVistoriaDetalhes = async () => {
      try {
        const data = await apiFetch(`/vistorias/${id}`, { method: "GET" });
        setVistoriaDetalhes(data);
      } catch (err) {
        console.error("Erro ao carregar dados da vistoria:", err);
        setMensagem(err.message || "Erro ao carregar dados da vistoria.");
      }
    };

    carregarVistoriaDetalhes();

    const urls = {};
    for (const c of comodos) {
      urls[c] = (form.comodos[c].anexos || []).map((file) => URL.createObjectURL(file));
    }
    setPreviewURLs(urls);

    return () => {
      for (const c of comodos) {
        if (urls[c]) urls[c].forEach((url) => URL.revokeObjectURL(url));
      }
    };
  }, [form.comodos, id]);

  const handleComodoChange = (comodo, field, value) => {
    setForm((prev) => {
      const novoComodo = { ...prev.comodos[comodo] };

      if (field === "Quantidade") {
        novoComodo.Quantidade = value;

        if (value === "" || value === "0") {
          ["Estrutura", "Pintura", "InstalacaoEletrica", "InstalacaoHidraulica", "Piso", "Telhado"].forEach((campo) => {
            novoComodo[campo] = "";
          });
          novoComodo.observacoes = "";
        } else {
          ["Estrutura", "Pintura", "InstalacaoEletrica", "InstalacaoHidraulica", "Piso", "Telhado"].forEach((campo) => {
            if (!novoComodo[campo]) novoComodo[campo] = "Bom";
          });
        }
      } else {
        novoComodo[field] = value;
      }

      return {
        ...prev,
        comodos: {
          ...prev.comodos,
          [comodo]: novoComodo,
        },
      };
    });
  };

  const handleAnexosChange = (comodo, e) => {
    const arquivos = Array.from(e.target.files || []);
    setForm((prev) => ({
      ...prev,
      comodos: {
        ...prev.comodos,
        [comodo]: {
          ...prev.comodos[comodo],
          anexos: arquivos,
        },
      },
    }));
  };

  const handleSubmit = async () => {
    if (step !== comodos.length) return;

    setMensagem("Enviando dados para gerar relatório...");

    try {
      const token = getToken();
      if (!token) {
        setMensagem("Sessão expirada. Faça login novamente.");
        navigate("/login");
        return;
      }

      const formData = new FormData();
      formData.append("idVistoria", form.idVistoria);

      // ✅ envia comodos sem anexos como JSON
      const comodosSemAnexos = {};
      for (const c of comodos) {
        const { anexos, ...rest } = form.comodos[c];
        comodosSemAnexos[c] = rest;
      }
      formData.append("comodos", JSON.stringify(comodosSemAnexos));

      // ✅ envia anexos
      for (const c of comodos) {
        (form.comodos[c].anexos || []).forEach((file) => {
          formData.append(`anexos_${c}`, file);
        });
      }

      const response = await fetch("http://localhost:3001/api/relatorio/gerar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.erro || data?.error || "Erro ao gerar relatório.");
      }

      if (data.arquivo) {
        navigate(`/vistoriador/vistoria/${form.idVistoria}`, {
          state: { relatorio: data.arquivo },
        });
      } else {
        setMensagem("Erro ao gerar relatório no backend.");
      }
    } catch (error) {
      setMensagem("Erro na requisição: " + (error.message || "Erro desconhecido"));
    }
  };

  const renderComodoForm = (comodo) => {
    const desabilitarCampos =
      form.comodos[comodo].Quantidade === "" || form.comodos[comodo].Quantidade === "0";

    return (
      <>
        <div className="form-group">
          <label>Quantidade de {comodo}:</label>
          <select
            value={form.comodos[comodo].Quantidade || ""}
            onChange={(e) => handleComodoChange(comodo, "Quantidade", e.target.value)}
          >
            <option value="">Selecione</option>
            {[...Array(11)].map((_, i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>

        {["Estrutura", "Pintura", "InstalacaoEletrica", "InstalacaoHidraulica", "Piso", "Telhado"].map((campo) => (
          <div className="form-group" key={campo}>
            <label>{campo.replace(/([A-Z])/g, " $1")}:</label>
            <select
              disabled={desabilitarCampos}
              value={form.comodos[comodo][campo] || ""}
              onChange={(e) => handleComodoChange(comodo, campo, e.target.value)}
            >
              <option value="">Selecione</option>
              {opcoesEstado.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </div>
        ))}

        <div className="form-group">
          <label>Observações sobre {comodo}:</label>
          <textarea
            rows={3}
            disabled={desabilitarCampos}
            value={form.comodos[comodo].observacoes || ""}
            onChange={(e) => handleComodoChange(comodo, "observacoes", e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Anexar arquivos (imagem, vídeo, áudio) para {comodo}:</label>
          <input
            type="file"
            multiple
            accept="image/*,video/*,audio/*"
            onChange={(e) => handleAnexosChange(comodo, e)}
          />

          {form.comodos[comodo].anexos.length > 0 && previewURLs[comodo] && (
            <ul className="anexos-list">
              {form.comodos[comodo].anexos.map((file, i) => (
                <li key={i}>
                  {file.type.startsWith("image/") && (
                    <img
                      src={previewURLs[comodo][i]}
                      alt={`preview-${i}`}
                      style={{ width: 100, borderRadius: 8, marginRight: 8, verticalAlign: "middle" }}
                    />
                  )}
                  {file.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="wizard-container">
      <div className="wizard-box">
        <div className="wizard-steps">
          {[...Array(comodos.length + 1)].map((_, i) => (
            <Step key={i} step={i} currentStep={step} />
          ))}
        </div>

        <h2 className="relatorio-header">Gerar Relatório Técnico</h2>

        {/* opcional: mostra info rápida da vistoria no topo */}
        {vistoriaDetalhes?.nomeempreendimento && (
          <div className="localizacao-box">
            <h3>{vistoriaDetalhes.nomeempreendimento}</h3>
            <p>
              Bloco: {vistoriaDetalhes.bloco ?? "-"} | Nº: {vistoriaDetalhes.numero ?? "-"}
            </p>
          </div>
        )}

        <div className="relatorio-form-container">
          {step >= 1 && step <= comodos.length ? renderComodoForm(comodos[step - 1]) : null}

          <div className="wizard-buttons">
            {step > 1 && (
              <button type="button" className="wizard-btn back" onClick={() => setStep(step - 1)}>
                Voltar
              </button>
            )}

            {step < comodos.length ? (
              <button type="button" className="wizard-btn next" onClick={() => setStep(step + 1)}>
                Avançar
              </button>
            ) : (
              <button type="button" className="wizard-btn next" onClick={handleSubmit}>
                Gerar Relatório
              </button>
            )}
          </div>
        </div>

        <button type="button" className="wizard-btn home" onClick={() => navigate("/home")}>
          Voltar para Home
        </button>

        <p className="relatorio-message">{mensagem}</p>
      </div>
    </div>
  );
}

export default CriarRelatorioPage;
