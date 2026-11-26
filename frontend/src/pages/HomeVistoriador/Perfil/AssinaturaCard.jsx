import { useState } from "react";
import { apiFetch, IMAGENS_PDF, urlDaApi } from "../../../services/api";

// B12: assinatura opcional do vistoriador, impressa no fim do PDF do relatório.
// A imagem fica no banco e só o próprio vistoriador a vê (GET /funcionarios/me/assinatura).
export default function AssinaturaCard({ temAssinatura: inicial }) {
  const [temAssinatura, setTemAssinatura] = useState(Boolean(inicial));
  const [arquivo, setArquivo] = useState(null);
  const [versao, setVersao] = useState(0); // força recarregar a imagem depois de trocar
  const [salvando, setSalvando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    if (!arquivo) return;
    setSalvando(true);
    try {
      const fd = new FormData();
      fd.append("assinatura", arquivo);
      await apiFetch("/funcionarios/me/assinatura", { method: "PUT", body: fd });
      setTemAssinatura(true);
      setArquivo(null);
      setVersao((v) => v + 1);
      e.target.reset();
      alert("Assinatura salva. Ela aparecerá nos próximos relatórios.");
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvando(false);
    }
  };

  const remover = async () => {
    if (!window.confirm("Remover a assinatura? Os próximos relatórios sairão só com o seu nome.")) return;
    try {
      await apiFetch("/funcionarios/me/assinatura", { method: "DELETE" });
      setTemAssinatura(false);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <form className="perfil-card" onSubmit={enviar}>
      <div className="editar-section-title">
        <h2 className="editar-h2">Assinatura</h2>
        <p className="editar-sub">Imagem (PNG ou JPEG, até 1 MB) impressa no fim dos relatórios que você gerar.</p>
      </div>

      {temAssinatura ? (
        <img
          src={`${urlDaApi("/funcionarios/me/assinatura")}?v=${versao}`}
          alt="Sua assinatura"
          style={{ maxWidth: 240, maxHeight: 120, background: "#fff", border: "1px solid #ddd", padding: 8 }}
        />
      ) : (
        <p className="editar-hint">Nenhuma assinatura cadastrada.</p>
      )}

      <div className="editar-upload">
        <input
          className="editar-file"
          type="file"
          accept={IMAGENS_PDF}
          onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="editar-actions">
        {temAssinatura ? (
          <button type="button" className="btn-secundario" onClick={remover}>
            Remover
          </button>
        ) : null}
        <button type="submit" className="admin-action-button" disabled={!arquivo || salvando}>
          {salvando ? "Enviando..." : temAssinatura ? "Trocar assinatura" : "Salvar assinatura"}
        </button>
      </div>
    </form>
  );
}
