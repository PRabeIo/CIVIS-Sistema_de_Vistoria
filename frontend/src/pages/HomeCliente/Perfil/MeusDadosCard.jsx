import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../../services/api";
import { ROTAS } from "../../../rotas";
import "../../styles/editarPerfil.css";

// S11 (LGPD): o titular baixa os próprios dados e pode excluir a conta.
// A exclusão pede a senha e a palavra EXCLUIR; o backend recusa se houver vistoria agendada/em curso.
export default function MeusDadosCard() {
  const [baixando, setBaixando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [mostrarExclusao, setMostrarExclusao] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");

  const baixar = async () => {
    setBaixando(true);
    try {
      const dados = await apiFetch("/clientes/me/dados");
      const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "meus-dados-civis.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    } finally {
      setBaixando(false);
    }
  };

  const excluir = async (e) => {
    e.preventDefault();
    if (!window.confirm("Excluir sua conta? Esta ação não pode ser desfeita.")) return;
    setExcluindo(true);
    try {
      const r = await apiFetch("/clientes/me", { method: "DELETE", body: JSON.stringify({ senha, confirmacao }) });
      alert(r?.message || "Conta excluída.");
      localStorage.removeItem("usuario");
      window.location.assign(ROTAS.inicial);
    } catch (err) {
      alert(err.message);
      setExcluindo(false);
    }
  };

  return (
    <section className="perfil-card" aria-labelledby="meus-dados-titulo">
      <div className="editar-section-title">
        <h2 id="meus-dados-titulo" className="editar-h2">
          Privacidade e dados
        </h2>
        <p className="editar-sub">
          Veja os <Link to={ROTAS.termos}>termos de uso</Link> e a{" "}
          <Link to={ROTAS.privacidade}>política de privacidade</Link>.
        </p>
      </div>

      <div className="editar-actions">
        <button type="button" className="btn-secundario" onClick={() => setMostrarExclusao((v) => !v)}>
          Excluir minha conta
        </button>
        <button type="button" className="admin-action-button" onClick={baixar} disabled={baixando}>
          {baixando ? "Gerando..." : "Baixar meus dados"}
        </button>
      </div>

      {mostrarExclusao ? (
        <form onSubmit={excluir} style={{ marginTop: 16, display: "grid", gap: 8 }}>
          <p className="editar-hint">
            Seus dados pessoais serão apagados e você não poderá mais entrar. Vistorias já realizadas continuam com a
            construtora, sem identificar você. Se houver vistoria agendada ou em andamento, a exclusão fica bloqueada
            até ela terminar.
          </p>
          <label htmlFor="exclusao-senha" className="perfil-label">
            Sua senha
          </label>
          <input
            id="exclusao-senha"
            className="editar-input"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
          <label htmlFor="exclusao-confirmacao" className="perfil-label">
            Digite EXCLUIR para confirmar
          </label>
          <input
            id="exclusao-confirmacao"
            className="editar-input"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            autoComplete="off"
            required
          />
          <div className="editar-actions">
            <button
              type="submit"
              className="admin-action-button"
              disabled={excluindo || !senha || confirmacao.trim().toUpperCase() !== "EXCLUIR"}
            >
              {excluindo ? "Excluindo..." : "Excluir definitivamente"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
