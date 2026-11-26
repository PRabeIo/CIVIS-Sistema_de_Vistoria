import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "./Login.css";
import { apiFetch } from "../../services/api";

function Login({ onLogin }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target.elements[0].value;
    const senha = e.target.elements[1].value;
    setLoading(true);

    try {
      // apiFetch: cookies de sessão (S5) e erro padronizado; 401 no login não tenta renovar
      const data = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, senha }) });

      const tipo = data?.usuario?.tipo;
      const id = data?.usuario?.id;
      const cargo = data?.usuario?.cargo ?? null;

      if (!tipo || !id) throw new Error("Resposta de login inválida (tipo/id ausente).");

      // a sessão fica em cookie httpOnly; aqui só os dados públicos do usuário
      localStorage.setItem("usuario", JSON.stringify({ tipo, id, cargo }));

      onLogin(tipo, id);

      alert(`Login de ${tipo} realizado com sucesso!`);
      navigate("/home");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="login-page">
      <div className="login-logo-section">
        <img src="assets/imagensLogin/logo.png" alt="CIVIS Logo" className="logo-image" />
      </div>
      <div className="login-content-wrapper">
        <div className="login-container">
          <button type="button" className="back-arrow" onClick={() => navigate("/")} aria-label="Voltar">
            ←
          </button>
          <h1 className="login-title">Login</h1>
          <form onSubmit={handleLogin} className="login-form">
            <label>Email</label>
            <input type="email" placeholder="Digite seu email" required />
            <label>Senha</label>
            <input type="password" placeholder="Digite sua senha" required />
            <button type="submit" className="login-button">
              {loading ? "Entrando..." : "Entrar"}
            </button>
            <p className="no-account" onClick={() => navigate("/cadastro-login")}>
              Não possui cadastro?
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
