import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../../services/api";
import "../../styles/editarPerfil.css";
import Navbar from "../../components/Navbar/Navbar"; // ajuste o caminho se necessário

/* ===== helpers (máscaras / normalização) ===== */
const onlyDigits = (v = "") => String(v).replace(/\D/g, "");

const maskCPF = (v = "") => {
  const d = onlyDigits(v).slice(0, 11);
  // 000.000.000-00
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

const maskTelefone = (v = "") => {
  const d = onlyDigits(v).slice(0, 11);

  // (00) 00000-0000 (11 dígitos) ou (00) 0000-0000 (10 dígitos)
  if (d.length <= 10) {
    return d
      .replace(/^(\d{0,2})/, "($1")
      .replace(/^\((\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return d
    .replace(/^(\d{0,2})/, "($1")
    .replace(/^\((\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
};

const normalizeEmail = (v = "") =>
  String(v).trim().toLowerCase().replace(/\s+/g, "");

const isEmailFormatoOk = (email = "") =>
  /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email);

function EditarPerfilVistoriador({ onLogout }) {
  const navigate = useNavigate();

  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);

  const [savingPerfil, setSavingPerfil] = useState(false);
  const [savingSenha, setSavingSenha] = useState(false);

  // --- dados do perfil ---
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  // ✅ cargo fixo (não editável)
  const [cargo, setCargo] = useState("");

  const [imagemFile, setImagemFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // snapshot do perfil inicial (para detectar mudanças)
  const initialPerfilRef = useRef(null);

  // --- senha (seção separada) ---
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [confirmarSenhaNova, setConfirmarSenhaNova] = useState("");

  const handleLogout = () => {
    if (onLogout) return onLogout();
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/login");
  };

  useEffect(() => {
    const fetchPerfil = async () => {
      setLoading(true);
      try {
        // ✅ perfil do funcionário logado
        const data = await apiFetch("/funcionarios/me", { method: "GET" });
        setPerfil(data || null);

        const n = data?.nome ?? "";
        const c = maskCPF(data?.cpf ?? "");
        const e = normalizeEmail(data?.email ?? "");
        const t = maskTelefone(data?.telefone ?? "");
        const cg = data?.cargo ?? "";

        setNome(n);
        setCpf(c);
        setEmail(e);
        setTelefone(t);
        setCargo(cg);

        initialPerfilRef.current = {
          nome: n,
          cpf: c,
          email: e,
          telefone: t,
          cargo: cg,
          imagemdeperfil: data?.imagemdeperfil ?? null,
        };
      } catch (err) {
        console.error("Erro ao buscar perfil do funcionário:", err);

        if (String(err.message).toLowerCase().includes("token")) {
          alert("Sessão expirada. Faça login novamente.");
          handleLogout();
          return;
        }

        alert(err.message || "Erro ao carregar perfil.");
      } finally {
        setLoading(false);
      }
    };

    fetchPerfil();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!imagemFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imagemFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imagemFile]);

  const fotoAtualUrl = useMemo(() => {
    if (previewUrl) return previewUrl;
    if (perfil?.imagemdeperfil) {
      return `http://localhost:3001/uploads/funcionarios/${perfil.imagemdeperfil}`;
    }
    return "/imagens/default-profile.png";
  }, [perfil?.imagemdeperfil, previewUrl]);

  // --- validações ---
  const validarPerfil = () => {
    if (!nome.trim()) return "Nome é obrigatório.";

    const emailNorm = normalizeEmail(email);
    if (!emailNorm) return "Email é obrigatório.";
    if (!isEmailFormatoOk(emailNorm)) return "Email inválido. Ex: nome@dominio.com";

    const cpfLen = onlyDigits(cpf).length;
    if (cpfLen !== 11) return "CPF inválido.";

    const telLen = onlyDigits(telefone).length;
    if (telLen !== 10 && telLen !== 11) return "Telefone inválido.";

    return null;
  };

  const validarSenha = () => {
    if (!senhaAtual.trim()) return "Informe sua senha atual.";
    if (!senhaNova.trim()) return "Informe a nova senha.";
    if (senhaNova.length < 8) return "A nova senha deve ter pelo menos 8 caracteres.";
    if (senhaNova !== confirmarSenhaNova) return "A confirmação da nova senha não confere.";
    return null;
  };

  const senhaValida = useMemo(() => {
    if (!senhaAtual.trim()) return false;
    if (!senhaNova.trim()) return false;
    if (!confirmarSenhaNova.trim()) return false;
    if (senhaNova.length < 8) return false;
    if (senhaNova !== confirmarSenhaNova) return false;
    return true;
  }, [senhaAtual, senhaNova, confirmarSenhaNova]);

  // --- detectar mudanças ---
  const mudouCampos = useMemo(() => {
    const init = initialPerfilRef.current;
    if (!init) return false;

    return (
      (nome ?? "") !== (init.nome ?? "") ||
      (cpf ?? "") !== (init.cpf ?? "") ||
      (email ?? "") !== (init.email ?? "") ||
      (telefone ?? "") !== (init.telefone ?? "")
      // cargo não entra porque não é editável
    );
  }, [nome, cpf, email, telefone]);

  const mudouImagem = useMemo(() => !!imagemFile, [imagemFile]);

  const perfilMudou = mudouCampos || mudouImagem;

  // --- submit perfil ---
  const salvarPerfil = async (e) => {
    e.preventDefault();

    if (!perfilMudou) {
      alert("Sem alterações para salvar.");
      return;
    }

    const erro = validarPerfil();
    if (erro) return alert(erro);

    setSavingPerfil(true);
    try {
      // 1) PATCH somente se campos mudaram
      if (mudouCampos) {
        await apiFetch("/funcionarios/me", {
          method: "PATCH",
          body: JSON.stringify({
            nome: nome.trim(),
            cpf: onlyDigits(cpf),
            email: normalizeEmail(email),
            telefone: onlyDigits(telefone),
          }),
        });
      }

      // 2) PUT avatar somente se imagem mudou
      if (mudouImagem) {
        const fd = new FormData();
        fd.append("imagemdeperfil", imagemFile);

        await apiFetch("/funcionarios/me/avatar", {
          method: "PUT",
          body: fd,
        });
      }

      alert("Dados do perfil atualizados!");
      // ✅ rota fixa (sem id)
      navigate("/vistoriador/perfil");
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);

      if (String(err.message).toLowerCase().includes("token")) {
        alert("Sessão expirada. Faça login novamente.");
        handleLogout();
        return;
      }

      alert(err.message || "Erro ao atualizar perfil.");
    } finally {
      setSavingPerfil(false);
    }
  };

  // --- submit senha ---
  const salvarSenha = async (e) => {
    e.preventDefault();

    const erro = validarSenha();
    if (erro) return alert(erro);

    setSavingSenha(true);
    try {
      await apiFetch("/funcionarios/me/senha", {
        method: "PUT",
        body: JSON.stringify({
          senhaAtual,
          senhaNova,
        }),
      });

      alert("Senha alterada com sucesso. Faça login novamente.");
      handleLogout();
    } catch (err) {
      console.error("Erro ao alterar senha:", err);

      if (String(err.message).toLowerCase().includes("token")) {
        alert("Sessão expirada. Faça login novamente.");
        handleLogout();
        return;
      }

      alert(err.message || "Erro ao alterar senha.");
    } finally {
      setSavingSenha(false);
      setSenhaAtual("");
      setSenhaNova("");
      setConfirmarSenhaNova("");
    }
  };

  return (
    <div className="home-container perfil-page editar-perfil-page">
      <Navbar onLogout={handleLogout} />

      <main className="admin-page-container">
        <div className="perfil-header">
          <h1 className="titulo-centralizado">Editar Perfil</h1>
        </div>

        {loading ? (
          <p>Carregando dados...</p>
        ) : !perfil ? (
          <p className="sem-registros">Não foi possível carregar seu perfil.</p>
        ) : (
          <div className="editar-stack">
            {/* CARD 1 — DADOS DO PERFIL */}
            <form className="perfil-card" onSubmit={salvarPerfil}>
              <div className="perfil-avatar-wrap">
                <img
                  src={fotoAtualUrl}
                  alt="Foto de perfil"
                  className="perfil-avatar"
                  onError={(e) => {
                    e.currentTarget.src = "/imagens/default-profile.png";
                  }}
                />
              </div>

              <div className="editar-upload">
                <span className="perfil-label">Foto de perfil</span>
                <input
                  className="editar-file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImagemFile(e.target.files?.[0] ?? null)}
                />
                <small className="editar-hint">
                  Se não selecionar nada, mantém a imagem atual.
                </small>
              </div>

              <div className="perfil-info-grid">
                <div className="perfil-info-item">
                  <span className="perfil-label">Nome</span>
                  <input
                    className="editar-input"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                  />
                </div>

                <div className="perfil-info-item">
                  <span className="perfil-label">Email</span>
                  <input
                    className="editar-input"
                    value={email}
                    onChange={(e) => setEmail(normalizeEmail(e.target.value))}
                    placeholder="xxxx@xx.xxx"
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                </div>

                <div className="perfil-info-item">
                  <span className="perfil-label">CPF</span>
                  <input
                    className="editar-input"
                    value={cpf}
                    onChange={(e) => setCpf(maskCPF(e.target.value))}
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div className="perfil-info-item">
                  <span className="perfil-label">Telefone</span>
                  <input
                    className="editar-input"
                    value={telefone}
                    onChange={(e) => setTelefone(maskTelefone(e.target.value))}
                    inputMode="numeric"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                {/* ✅ Cargo fixo (não editável) */}
                <div className="perfil-info-item">
                  <span className="perfil-label">Cargo</span>
                  <input
                    className="editar-input editar-input-disabled"
                    value={cargo || "-"}
                    disabled
                    readOnly
                  />
                </div>
              </div>

              <div className="editar-actions">
                <button
                  type="button"
                  className="btn-secundario"
                  onClick={() => navigate("/vistoriador/perfil")}
                  disabled={savingPerfil}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="admin-action-button"
                  disabled={savingPerfil || !perfilMudou}
                >
                  {savingPerfil ? "Salvando..." : "Salvar Perfil"}
                </button>
              </div>
            </form>

            {/* CARD 2 — SEGURANÇA */}
            <form className="perfil-card" onSubmit={salvarSenha}>
              <div className="editar-section-title">
                <h2 className="editar-h2">Segurança</h2>
                <p className="editar-sub">
                  Para alterar sua senha, confirme sua senha atual.
                </p>
              </div>

              <div className="perfil-info-grid">
                <div className="perfil-info-item">
                  <span className="perfil-label">Senha atual</span>
                  <input
                    className="editar-input"
                    type="password"
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    placeholder="Digite sua senha atual"
                  />
                </div>

                <div className="perfil-info-item">
                  <span className="perfil-label">Nova senha</span>
                  <input
                    className="editar-input"
                    type="password"
                    value={senhaNova}
                    onChange={(e) => setSenhaNova(e.target.value)}
                    placeholder="Digite a nova senha"
                  />
                </div>

                <div className="perfil-info-item">
                  <span className="perfil-label">Confirmar nova senha</span>
                  <input
                    className="editar-input"
                    type="password"
                    value={confirmarSenhaNova}
                    onChange={(e) => setConfirmarSenhaNova(e.target.value)}
                    placeholder="Repita a nova senha"
                  />
                </div>
              </div>

              <div className="editar-actions">
                <button
                  type="submit"
                  className="admin-action-button"
                  disabled={savingSenha || !senhaValida}
                >
                  {savingSenha ? "Alterando..." : "Alterar Senha"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default EditarPerfilVistoriador;