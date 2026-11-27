import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import "./CriarRelatorioPage.css";
import { apiFetch, IMAGENS_PDF } from "../../../services/api";

const opcoesEstado = ["Péssimo", "Ruim", "Razoável", "Bom", "Excelente"];
const OBSERVACAO_MAX = 2000; // S12: mesmo limite do backend (domain/textoIA.ts)
const comodos = ["quartos", "banheiros", "sala", "cozinha", "varanda"];

const COMODO_LABEL = {
  quartos: "Quartos",
  banheiros: "Banheiros",
  sala: "Sala",
  cozinha: "Cozinha",
  varanda: "Varanda",
};

const CAMPOS_AVALIACAO = [
  { key: "Estrutura", label: "Estrutura" },
  { key: "Pintura", label: "Pintura" },
  { key: "InstalacaoEletrica", label: "Instalação Elétrica" },
  { key: "InstalacaoHidraulica", label: "Instalação Hidráulica" },
  { key: "Piso", label: "Piso" },
  { key: "Telhado", label: "Telhado" },
];

// ✅ Soft save (Opção A)
const DRAFT_PREFIX = "civis:relatorio-draft:";

function Step({ index, label, currentStep }) {
  const stepNumber = index + 1;
  const status =
    currentStep === stepNumber ? "active" : currentStep < stepNumber ? "inactive" : "complete";

  return (
    <div className={`step-wrapper ${status}`}>
      <motion.div
        initial={false}
        animate={status}
        variants={{
          inactive: { backgroundColor: "#fff", borderColor: "#cbd5e1", color: "#94a3b8" },
          active: { backgroundColor: "#fff", borderColor: "#135ea5", color: "#135ea5" },
          complete: { backgroundColor: "#135ea5", borderColor: "#135ea5", color: "#fff" },
        }}
        transition={{ duration: 0.2 }}
        className="step-circle"
        aria-label={`Etapa ${stepNumber}: ${label}`}
      >
        {status === "complete" ? <CheckIcon /> : <span>{stepNumber}</span>}
      </motion.div>

      <span className="step-label">{label}</span>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} width="18" height="18">
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.1, type: "tween", ease: "easeOut", duration: 0.25 }}
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

  const totalSteps = comodos.length;

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

  // começa no primeiro cômodo (1..totalSteps)
  const [step, setStep] = useState(1);

  const [mensagem, setMensagem] = useState("");
  const [vistoriaDetalhes, setVistoriaDetalhes] = useState(null);

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

  // ✅ loading overlay ao gerar relatório
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ Soft save control
  const draftKey = useMemo(() => `${DRAFT_PREFIX}${id}`, [id]);
  const [hydrated, setHydrated] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const comodoAtual = comodos[step - 1];
  const labelComodoAtual = COMODO_LABEL[comodoAtual] || comodoAtual;

  const progresso = useMemo(() => {
    const pct = Math.round((step / totalSteps) * 100);
    return Math.max(0, Math.min(100, pct));
  }, [step, totalSteps]);

  // ✅ 1) Carrega rascunho ao abrir
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) {
        setHydrated(true);
        return;
      }

      const draft = JSON.parse(raw);

      if (typeof draft?.step === "number") {
        const s = Math.min(Math.max(1, draft.step), totalSteps);
        setStep(s);
      }

      if (draft?.form && typeof draft.form === "object" && draft.form?.comodos) {
        // reidrate comodos e força anexos=[]
        const comodosRestaurados = Object.fromEntries(
          Object.entries(draft.form.comodos).map(([k, v]) => [k, { ...v, anexos: [] }])
        );

        setForm((prev) => ({
          ...prev,
          ...draft.form,
          idVistoria: id || prev.idVistoria,
          comodos: {
            ...prev.comodos,
            ...comodosRestaurados,
          },
        }));
      }

      if (draft?.savedAt) setLastSavedAt(draft.savedAt);
    } catch (e) {
      console.warn("Draft inválido, ignorando", e);
    } finally {
      setHydrated(true);
    }
  }, [draftKey, id, totalSteps]);

  // ✅ 2) Auto-save com debounce (salva form SEM anexos)
  useEffect(() => {
    if (!hydrated) return;

    const t = setTimeout(() => {
      try {
        const formSemAnexos = {
          ...form,
          comodos: Object.fromEntries(
            Object.entries(form.comodos).map(([k, v]) => {
              const { anexos, ...rest } = v;
              return [k, rest];
            })
          ),
        };

        const payload = {
          step,
          form: formSemAnexos,
          savedAt: new Date().toISOString(),
        };

        localStorage.setItem(draftKey, JSON.stringify(payload));
        setLastSavedAt(payload.savedAt);
      } catch (e) {
        // Pode falhar se storage estiver cheio
        console.warn("Não foi possível salvar draft", e);
      }
    }, 350);

    return () => clearTimeout(t);
  }, [hydrated, draftKey, step, form]);

  // carrega dados da vistoria (topo)
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
  }, [id]);

  // previews de anexos
  useEffect(() => {
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
  }, [form.comodos]);

  const handleComodoChange = (comodo, field, value) => {
    setForm((prev) => {
      const novoComodo = { ...prev.comodos[comodo] };

      if (field === "Quantidade") {
        novoComodo.Quantidade = value;

        if (value === "" || value === "0") {
          CAMPOS_AVALIACAO.forEach(({ key }) => (novoComodo[key] = ""));
          novoComodo.observacoes = "";
          novoComodo.anexos = [];
        } else {
          CAMPOS_AVALIACAO.forEach(({ key }) => {
            if (!novoComodo[key]) novoComodo[key] = "Bom";
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

  const renderFileChip = (file, url, index) => {
    const isImg = file.type?.startsWith("image/");
    const isVideo = file.type?.startsWith("video/");
    const isAudio = file.type?.startsWith("audio/");

    return (
      <li key={`${file.name}-${index}`} className="anexo-item">
        <div className="anexo-left">
          {isImg ? (
            <img src={url} alt={`preview-${index}`} className="anexo-thumb" />
          ) : (
            <div className="anexo-icon" aria-hidden="true">
              {isVideo ? "🎥" : isAudio ? "🎧" : "📎"}
            </div>
          )}

          <div className="anexo-meta">
            <span className="anexo-name">{file.name}</span>
            <span className="anexo-type">
              {isImg ? "Imagem" : isVideo ? "Vídeo" : isAudio ? "Áudio" : "Arquivo"}
            </span>
          </div>
        </div>
      </li>
    );
  };

  // (4) validação leve + confirmação
  const validarAntesDeEnviar = () => {
    const pendencias = [];

    for (const c of comodos) {
      const qtd = form.comodos[c].Quantidade;
      const temComodo = qtd && qtd !== "0";

      if (!temComodo) continue;

      const faltando = CAMPOS_AVALIACAO.filter(({ key }) => !form.comodos[c][key]).map((x) => x.label);

      if (faltando.length > 0) {
        pendencias.push(`• ${COMODO_LABEL[c] || c}: faltando ${faltando.join(", ")}`);
      }
    }

    if (pendencias.length > 0) {
      const msg =
        "Antes de gerar o relatório, encontrei campos não preenchidos:\n\n" +
        pendencias.join("\n") +
        "\n\nVocê deseja gerar mesmo assim?";
      return window.confirm(msg);
    }

    return window.confirm("Confirmar geração do relatório técnico?");
  };

  const handleSubmit = async () => {
    if (step !== totalSteps) return;

    const ok = validarAntesDeEnviar();
    if (!ok) return;

    setIsSubmitting(true);
    setMensagem("Gerando relatório com IA... isso pode levar alguns segundos.");

    try {
      const formData = new FormData();
      formData.append("idVistoria", form.idVistoria);

      // envia comodos sem anexos como JSON
      const comodosSemAnexos = {};
      for (const c of comodos) {
        const { anexos, ...rest } = form.comodos[c];
        comodosSemAnexos[c] = rest;
      }
      formData.append("comodos", JSON.stringify(comodosSemAnexos));

      // envia anexos
      for (const c of comodos) {
        (form.comodos[c].anexos || []).forEach((file) => {
          formData.append(`anexos_${c}`, file);
        });
      }

      // apiFetch não define Content-Type para FormData (o navegador põe o boundary)
      const data = await apiFetch("/relatorio/gerar", { method: "POST", body: formData });

      if (data.arquivo) {
        // ✅ ao gerar com sucesso, limpa draft local
        localStorage.removeItem(draftKey);

        navigate(`/vistoriador/vistoria/${form.idVistoria}`, {
          state: { relatorio: data.arquivo },
        });
      } else {
        setMensagem("Erro ao gerar relatório no backend.");
      }
    } catch (error) {
      setMensagem("Erro na requisição: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderComodoForm = (comodo) => {
    const quantidade = form.comodos[comodo].Quantidade || "";
    const mostrarCampos = quantidade !== "" && quantidade !== "0";

    return (
      <>
        <div className="form-grid">
          <div className="form-group">
            <label>Quantidade de {COMODO_LABEL[comodo] || comodo}</label>
            <select
              value={quantidade}
              onChange={(e) => handleComodoChange(comodo, "Quantidade", e.target.value)}
            >
              <option value="">Selecione</option>
              {[...Array(11)].map((_, i) => (
                <option key={i} value={String(i)}>
                  {i}
                </option>
              ))}
            </select>

            {!mostrarCampos && (
              <small className="hint">Se a quantidade for 0, os campos abaixo não são necessários.</small>
            )}
          </div>
        </div>

        {/* esconde campos quando qtd = 0 */}
        {mostrarCampos && (
          <>
            <div className="form-grid">
              {CAMPOS_AVALIACAO.map(({ key, label }) => (
                <div className="form-group" key={key}>
                  <label>{label}</label>
                  <select
                    value={form.comodos[comodo][key] || ""}
                    onChange={(e) => handleComodoChange(comodo, key, e.target.value)}
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
            </div>

            <div className="form-group">
              <label>Observações sobre {COMODO_LABEL[comodo] || comodo}</label>
              <textarea
                rows={4}
                maxLength={OBSERVACAO_MAX}
                value={form.comodos[comodo].observacoes || ""}
                onChange={(e) => handleComodoChange(comodo, "observacoes", e.target.value)}
                placeholder="Descreva detalhes relevantes, desgastes, irregularidades, etc."
              />
              <small className="hint">
                {(form.comodos[comodo].observacoes || "").length}/{OBSERVACAO_MAX} caracteres
              </small>
            </div>

            <div className="form-group">
              <label>Anexar arquivos (imagem, vídeo, áudio) para {COMODO_LABEL[comodo] || comodo}</label>
              <input
                type="file"
                multiple
                accept={IMAGENS_PDF}
                onChange={(e) => handleAnexosChange(comodo, e)}
              />

              {(form.comodos[comodo].anexos || []).length > 0 && previewURLs[comodo] && (
                <ul className="anexos-list">
                  {form.comodos[comodo].anexos.map((file, i) =>
                    renderFileChip(file, previewURLs[comodo][i], i)
                  )}
                </ul>
              )}
            </div>
          </>
        )}
      </>
    );
  };

  // opcional: mostrar “último rascunho”
  const ultimoRascunhoTexto = useMemo(() => {
    if (!lastSavedAt) return null;
    const d = new Date(lastSavedAt);
    if (isNaN(d.getTime())) return null;

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

    return `Rascunho salvo em ${data} às ${hora}`;
  }, [lastSavedAt]);

  return (
    <div className="home-container criar-relatorio-page">
      <div className="criar-relatorio-card">
        <div className="criar-relatorio-steps">
          {comodos.map((c, idx) => (
            <Step key={c} index={idx} label={COMODO_LABEL[c] || c} currentStep={step} />
          ))}
        </div>

        <h2 className="criar-relatorio-title">
          {COMODO_LABEL[comodoAtual]}
          <span className="criar-relatorio-subtitle">Avaliação do Ambiente</span>
        </h2>

        <div className="criar-relatorio-progress">
          <div className="progress-head">
            <span className="progress-step">
              Etapa {step} de {totalSteps} — <strong>{labelComodoAtual}</strong>
            </span>
            <span className="progress-pct">{progresso}%</span>
          </div>

          <div className="progress-bar" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${progresso}%` }} />
          </div>

          {ultimoRascunhoTexto ? <small className="draft-hint">{ultimoRascunhoTexto}</small> : null}
        </div>

        {vistoriaDetalhes?.nomeempreendimento && (
          <div className="criar-relatorio-local">
            <h3>{vistoriaDetalhes.nomeempreendimento}</h3>
            <p>
              Bloco: {vistoriaDetalhes.bloco ?? "-"} | Nº: {vistoriaDetalhes.numero ?? "-"}
            </p>
          </div>
        )}

        <div className="criar-relatorio-form">
          {step >= 1 && step <= totalSteps ? renderComodoForm(comodos[step - 1]) : null}

          <div className="criar-relatorio-actions">
            {step > 1 ? (
              <button
                type="button"
                className="criar-relatorio-btn back"
                onClick={() => setStep(step - 1)}
                disabled={isSubmitting}
              >
                Voltar
              </button>
            ) : (
              <span />
            )}

            {step < totalSteps ? (
              <button
                type="button"
                className="criar-relatorio-btn next"
                onClick={() => setStep(step + 1)}
                disabled={isSubmitting}
              >
                Avançar
              </button>
            ) : (
              <button
                type="button"
                className="criar-relatorio-btn next"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Gerando..." : "Gerar Relatório"}
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          className="criar-relatorio-btn home"
          onClick={() => navigate("/home")}
          disabled={isSubmitting}
        >
          Voltar para Home
        </button>

        {mensagem ? <p className="criar-relatorio-message">{mensagem}</p> : null}
      </div>

      {/* ✅ OVERLAY LOADING */}
      {isSubmitting && (
        <div className="loading-overlay" role="status" aria-live="polite">
          <div className="loading-modal">
            <div className="spinner" />
            <p className="loading-title">Gerando relatório…</p>
            <p className="loading-subtitle">Aguarde. Não feche esta página.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default CriarRelatorioPage;