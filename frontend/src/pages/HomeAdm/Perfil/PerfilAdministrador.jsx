import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../../services/api";
import "../../styles/perfil.css";
import Navbar from "../../components/Navbar/Navbar"; 

/* ===== helpers (máscaras / normalização) ===== */
const onlyDigits = (v = "") => String(v).replace(/\D/g, "");

const maskCPF = (v = "") => {
  const d = onlyDigits(v).slice(0, 11);
  if (!d) return "";
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

const maskTelefone = (v = "") => {
  const d = onlyDigits(v).slice(0, 11);
  if (!d) return "";

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

function PerfilAdministrador({ onLogout }) {
  const navigate = useNavigate();

  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);

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
        // ✅ como admin é funcionário, pega o perfil do funcionário logado
        const data = await apiFetch("/funcionarios/me", { method: "GET" });
        setPerfil(data || null);
      } catch (err) {
        console.error("Erro ao buscar perfil do administrador:", err);

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

  const fotoUrl =
    perfil?.imagemdeperfil
      ? `http://localhost:3001/uploads/funcionarios/${perfil.imagemdeperfil}`
      : "/imagens/default-profile.png";

  const cpfFormatado = useMemo(() => maskCPF(perfil?.cpf ?? ""), [perfil?.cpf]);
  const telefoneFormatado = useMemo(
    () => maskTelefone(perfil?.telefone ?? ""),
    [perfil?.telefone]
  );
  const emailFormatado = useMemo(
    () => (perfil?.email ? normalizeEmail(perfil.email) : ""),
    [perfil?.email]
  );

  return (
    <div className="home-container perfil-page">
      {/* ✅ Navbar global (decide links por tipo do usuário) */}
      <Navbar onLogout={handleLogout} />

      <main className="admin-page-container">
        <div className="perfil-header">
          <h1 className="titulo-centralizado">Meu Perfil</h1>
        </div>

        {loading ? (
          <p>Carregando perfil...</p>
        ) : !perfil ? (
          <p className="sem-registros">Não foi possível carregar seu perfil.</p>
        ) : (
          <div className="perfil-card">
            <div className="perfil-avatar-wrap">
              <img
                src={fotoUrl}
                alt="Foto de perfil do administrador"
                className="perfil-avatar"
                onError={(e) => {
                  e.currentTarget.src = "/imagens/default-profile.png";
                }}
              />
            </div>

            <div className="perfil-info-grid">
              <div className="perfil-info-item">
                <span className="perfil-label">Nome</span>
                <span className="perfil-value">{perfil.nome || "-"}</span>
              </div>

              <div className="perfil-info-item">
                <span className="perfil-label">Email</span>
                <span className="perfil-value">{emailFormatado || "-"}</span>
              </div>

              <div className="perfil-info-item">
                <span className="perfil-label">CPF</span>
                <span className="perfil-value">{cpfFormatado || "-"}</span>
              </div>

              <div className="perfil-info-item">
                <span className="perfil-label">Telefone</span>
                <span className="perfil-value">{telefoneFormatado || "-"}</span>
              </div>

              <div className="perfil-info-item">
                <span className="perfil-label">Cargo</span>
                <span className="perfil-value">{perfil.cargo || "Administrador"}</span>
              </div>
            </div>

            <div className="perfil-actions">
              <button
                className="admin-action-button"
                onClick={() => navigate("/admin/editar-perfil")}
              >
                Editar Perfil
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default PerfilAdministrador;