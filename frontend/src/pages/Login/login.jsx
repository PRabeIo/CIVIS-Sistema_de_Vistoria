import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "./Login.css";

function Login({ onLogin }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target.elements[0].value;
    const senha = e.target.elements[1].value;
    setLoading(true);

    try {
      const response = await fetch("http://localhost:3001/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.erro || data.error || "Erro desconhecido.");

      // aceita formato antigo e novo
      const tipo = data.tipo ?? data.usuario?.tipo;
      const id   = data.id   ?? data.usuario?.id;
      const token = data.token;
      const cargo = data.usuario?.cargo ?? null;

      if (!tipo || !id) throw new Error("Resposta de login inválida (tipo/id ausente).");
      if (!token) throw new Error("Resposta de login inválida (token ausente).");

      // salva token e usuário
      localStorage.setItem("token", token);
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
