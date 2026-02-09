import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import InputMask from "react-input-mask-next";
import "../Login/Login.css";

function CadastroLogin() {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

const handleRegister = async (e) => {
  e.preventDefault();

  if (password !== confirmPassword) {
    alert("As senhas não coincidem!");
    return;
  }

  try {
    const response = await fetch('http://localhost:3001/api/clientes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nome,
        cpf,
        email,
        senha: password,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      alert(`Erro: ${data.error}`);
      return;
    }

    alert('Cadastro realizado com sucesso! Agora você pode fazer login.');
    navigate('/login');
  } catch (error) {
    console.error('Erro ao cadastrar:', error);
    alert('Erro ao cadastrar. Tente novamente mais tarde.');
  }
};


  return (
    <div className="login-page">
      <div className="login-logo-section">
        <img
          src="src/pages/Inicial/logo.png"
          alt="CIVIS Logo"
          className="logo-image"
        />
      </div>

      <div className="login-content-wrapper">
        <div className="login-container">
          <button
            type="button"
            className="back-arrow"
            onClick={() => navigate("/login")}
            aria-label="Voltar"
          >
            &#8592;
          </button>

          <h1 className="login-title">Cadastro</h1>

          <form onSubmit={handleRegister} className="login-form">
            <label>Nome</label>
            <input
              type="text"
              placeholder="Digite seu nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />

            <label>CPF</label>
            <input
              type="text"
              placeholder="Digite seu CPF"
              value={cpf}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '');
                const masked = raw
                  .replace(/^(\d{3})(\d)/, '$1.$2')
                  .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
                  .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
                  .slice(0, 14); // limita a 14 caracteres
                setCpf(masked);
              }}
              required
            />


            <label>Email</label>
            <input
              type="email"
              placeholder="Digite seu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label>Senha</label>
            <input
              type="password"
              placeholder="Crie sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <label>Confirme a senha</label>
            <input
              type="password"
              placeholder="Confirme sua senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <button type="submit" className="login-button">
              Cadastrar
            </button>

            <p className="no-account" onClick={() => navigate("/login")}>
              Já possui cadastro?
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CadastroLogin;
