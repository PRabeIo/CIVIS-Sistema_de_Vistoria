import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../../../services/api";
import "./IniciarVistoriaDetalhesPage.css";

const LS_KEY_PREFIX = "civis:vistoria-dados:";

function IniciarVistoriaDetalhesPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [vistoria, setVistoria] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [menuOpen, setMenuOpen] = useState(false);

  const [form, setForm] = useState({
    condicoesClimaticas: "",
    imprevistos: "",
    observacoesGerais: "",
  });

  const lsKey = useMemo(() => `${LS_KEY_PREFIX}${id}`, [id]);

  const doLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/login");
  };

  useEffect(() => {
    // carrega rascunho salvo (se houver)
    try {
      const draft = JSON.parse(localStorage.getItem(lsKey) || "null");
      if (draft && typeof draft === "object") {
        setForm({
          condicoesClimaticas: draft.condicoesClimaticas || "",
          imprevistos: draft.imprevistos || "",
          observacoesGerais: draft.observacoesGerais || "",
        });
      }
    } catch (_) {}
  }, [lsKey]);

  useEffect(() => {
    const carregar = async () => {
      setIsLoading(true);
      try {
        const data = await apiFetch(`/vistorias/${id}`, { method: "GET" });
        setVistoria(data);
      } catch (err) {
        console.error("Erro ao buscar vistoria:", err);

        if (String(err.message).toLowerCase().includes("token")) {
          alert("Sessão expirada. Faça login novamente.");
          localStorage.removeItem("token");
          localStorage.removeItem("usuario");
          navigate("/login");
          return;
        }

        alert(err.message || "Erro ao carregar vistoria.");
        navigate("/home");
      } finally {
        setIsLoading(false);
      }
    };

    carregar();
  }, [id, navigate]);

  const status = (vistoria?.status || "").trim();
  const podeEditar = status === "Em Andamento";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSalvarLocal = () => {
    localStorage.setItem(lsKey, JSON.stringify(form));
    alert("Dados salvos (rascunho).");
  };

  const handleIrParaRelatorio = () => {
    localStorage.setItem(lsKey, JSON.stringify(form));

    navigate(`/vistoriador/criar-relatorio/${id}`, {
      state: {
        dadosGerais: form,
      },
    });
  };

  if (isLoading) return <div className="loading">Carregando formulário de vistoria...</div>;
  if (!vistoria) return <div className="error">Vistoria não encontrada.</div>;

  return (
    <div className="home-container">
      {/* NAVBAR PADRÃO CIVIS (com hamburger) */}
      <header className="navbar">
        <div className="logo">CIVIS</div>

        <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
          {/* ajuste as rotas se o vistoriador tiver páginas diferentes */}
          <a href="#" onClick={() => navigate("/home")}>Home</a>
          <a href="#" onClick={() => navigate("/vistorias-agendadas")}>Vistorias Agendadas</a>
          <a href="#" onClick={() => navigate("/minhas-vistorias")}>Minhas Vistorias</a>

          <button className="logout-button mobile-logout" onClick={doLogout}>Sair</button>
        </nav>

        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          ☰
        </button>

        <button className="logout-button desktop-logout" onClick={doLogout}>Sair</button>
      </header>

      {/* CONTEÚDO ORIGINAL DA PÁGINA */}
      <div className="iniciar-vistoria-detalhes-container">
        <h1>{vistoria.nomeempreendimento || "Detalhes da Vistoria"}</h1>

        <h2 className="subtitulo-bloco-numero">
          Bloco {vistoria.bloco ?? "-"} Número {vistoria.numero ?? "-"}
        </h2>

        <p className="description">
          Preencha os dados gerais (rascunho) para auxiliar na geração do relatório.
        </p>

        {!podeEditar && (
          <div style={{ marginBottom: 18, color: "#856404", background: "#fff3cd", padding: 12, borderRadius: 8 }}>
            Esta vistoria está com status <strong>{status || "Indefinido"}</strong>.{" "}
            Você pode apenas visualizar os dados (o relatório só pode ser gerado em <strong>Em Andamento</strong>).
          </div>
        )}

        <form className="iniciar-vistoria-form" onSubmit={(e) => e.preventDefault()}>
          <label htmlFor="condicoesClimaticas" className="label">Condições Climáticas:</label>
          <input
            type="text"
            id="condicoesClimaticas"
            name="condicoesClimaticas"
            value={form.condicoesClimaticas}
            onChange={handleChange}
            placeholder="Ex: Ensolarado, Chuvoso, Nublado"
            readOnly={!podeEditar}
          />

          <label htmlFor="imprevistos" className="label">Imprevistos:</label>
          <textarea
            id="imprevistos"
            name="imprevistos"
            value={form.imprevistos}
            onChange={handleChange}
            placeholder="Registre imprevistos ou eventos fora do esperado"
            readOnly={!podeEditar}
            className="campo-imprevistos"
          />

          <label htmlFor="observacoesGerais" className="label">Observações Gerais da Vistoria:</label>
          <textarea
            id="observacoesGerais"
            name="observacoesGerais"
            value={form.observacoesGerais}
            onChange={handleChange}
            placeholder="Registre observações gerais, detalhes da inspeção, etc."
            readOnly={!podeEditar}
          />

          <p>
            <strong>Status Atual da Vistoria:</strong> {status || "Indefinido"}
          </p>

          <div className="form-actions-extended">
            <button
              type="button"
              onClick={handleSalvarLocal}
              className="action-button save-button"
              disabled={!podeEditar}
            >
              Salvar Rascunho
            </button>

            <button
              type="button"
              onClick={handleIrParaRelatorio}
              className="action-button report-button"
              disabled={!podeEditar}
            >
              Ir para Relatório
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default IniciarVistoriaDetalhesPage;
