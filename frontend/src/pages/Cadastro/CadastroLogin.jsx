import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../Login/Login.css";
import { apiFetch } from "../../services/api";
import { ROTAS } from "../../rotas";

function CadastroLogin() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nome: "",
    cpf: "",
    email: "",
    senha: "",
    confirmarSenha: "",
    telefone: "",
  });
  const [aceiteTermos, setAceiteTermos] = useState(false); // S11

  // erros visíveis embaixo do campo
  const [nomeErro, setNomeErro] = useState("");
  const [cpfErro, setCpfErro] = useState("");
  const [emailErro, setEmailErro] = useState("");
  const [senhaErro, setSenhaErro] = useState("");

  // só exibir mensagem depois que o usuário tocar no campo
  const [touched, setTouched] = useState({
    nome: false,
    cpf: false,
    email: false,
    confirmarSenha: false,
  });

  const somenteDigitos = (v) => String(v ?? "").replace(/\D/g, "");

  const validarNome = (nome) => {
    const n = String(nome ?? "").trim();
    if (!n) return "Nome é obrigatório.";
    if (n.length < 3) return "Digite pelo menos 3 caracteres.";
    return "";
  };

  const validarCPF = (cpf) => {
    const digits = somenteDigitos(cpf);
    if (!digits) return "CPF é obrigatório.";
    if (digits.length !== 11) return "CPF inválido (precisa ter 11 dígitos).";
    return "";
  };

  const validarEmail = (email) => {
    const e = String(email ?? "").trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!e) return "Email é obrigatório.";
    if (!emailRegex.test(e)) return "Digite um email válido. Ex: nome@email.com";
    return "";
  };

  const validarSenhas = (senha, confirmarSenha) => {
    if (!confirmarSenha) return "Confirme a senha.";
    if (senha !== confirmarSenha) return "As senhas não coincidem.";
    return "";
  };

  // quando senha muda, revalida confirmar
  useEffect(() => {
    if (touched.confirmarSenha) {
      setSenhaErro(validarSenhas(formData.senha, formData.confirmarSenha));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.senha]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Nome
    if (name === "nome") {
      setFormData((prev) => ({ ...prev, nome: value }));
      if (touched.nome) setNomeErro(validarNome(value));
      return;
    }

    // CPF (máscara + validação)
    if (name === "cpf") {
      const raw = value.replace(/\D/g, "");
      const masked = raw
        .replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4")
        .slice(0, 14);

      setFormData((prev) => ({ ...prev, cpf: masked }));
      if (touched.cpf) setCpfErro(validarCPF(masked));
      return;
    }

    // Telefone (opcional) (máscara)
    if (name === "telefone") {
      const raw = value.replace(/\D/g, "");
      const masked = raw
        .replace(/^(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2")
        .slice(0, 15);

      setFormData((prev) => ({ ...prev, telefone: masked }));
      return;
    }

    // Email (lowercase + valida)
    if (name === "email") {
      const emailLower = value.toLowerCase();
      setFormData((prev) => ({ ...prev, email: emailLower }));
      if (touched.email) setEmailErro(validarEmail(emailLower));
      return;
    }

    // Senha
    if (name === "senha") {
      setFormData((prev) => ({ ...prev, senha: value }));
      if (touched.confirmarSenha) {
        setSenhaErro(validarSenhas(value, formData.confirmarSenha));
      }
      return;
    }

    // Confirmar senha
    if (name === "confirmarSenha") {
      setFormData((prev) => ({ ...prev, confirmarSenha: value }));
      if (touched.confirmarSenha) {
        setSenhaErro(validarSenhas(formData.senha, value));
      }
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    if (field === "nome") setNomeErro(validarNome(formData.nome));
    if (field === "cpf") setCpfErro(validarCPF(formData.cpf));
    if (field === "email") setEmailErro(validarEmail(formData.email));
    if (field === "confirmarSenha") {
      setSenhaErro(validarSenhas(formData.senha, formData.confirmarSenha));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // força mostrar erros
    setTouched({ nome: true, cpf: true, email: true, confirmarSenha: true });

    const erroNome = validarNome(formData.nome);
    const erroCpf = validarCPF(formData.cpf);
    const erroEmail = validarEmail(formData.email);
    const erroSenha = validarSenhas(formData.senha, formData.confirmarSenha);

    setNomeErro(erroNome);
    setCpfErro(erroCpf);
    setEmailErro(erroEmail);
    setSenhaErro(erroSenha);

    if (erroNome || erroCpf || erroEmail || erroSenha) return;

    try {
      await apiFetch("/clientes/cadastro", {
        method: "POST",
        body: JSON.stringify({
          nome: formData.nome.trim(),
          cpf: somenteDigitos(formData.cpf),
          email: formData.email.trim().toLowerCase(),
          senha: formData.senha,
          telefone: somenteDigitos(formData.telefone), // opcional (pode ser "")
          aceiteTermos, // S11: o backend recusa o cadastro sem o aceite
        }),
      });

      alert("Cadastro realizado com sucesso! Agora você pode fazer login.");
      navigate("/login");
    } catch (error) {
      alert(error.message || "Erro ao cadastrar. Tente novamente mais tarde.");
    }
  };

  const cadastrarDesabilitado = !aceiteTermos || !!nomeErro || !!cpfErro || !!emailErro || !!senhaErro;

  return (
    <div className="login-page">
      <div className="login-logo-section">
        <img src="src/pages/Inicial/logo.png" alt="CIVIS Logo" className="logo-image" />
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
            <label htmlFor="nome">Nome</label>
            <input
              id="nome"
              name="nome"
              type="text"
              placeholder="Digite seu nome completo"
              value={formData.nome}
              onChange={handleChange}
              onBlur={() => handleBlur("nome")}
              required
              style={{ borderColor: touched.nome && nomeErro ? "#dc3545" : undefined }}
            />
            {touched.nome && nomeErro && (
              <small className="cadastro-hint cadastro-hint--erro">{nomeErro}</small>
            )}

            <label htmlFor="cpf">CPF</label>
            <input
              id="cpf"
              name="cpf"
              type="text"
              placeholder="Digite seu CPF"
              value={formData.cpf}
              onChange={handleChange}
              onBlur={() => handleBlur("cpf")}
              required
              style={{ borderColor: touched.cpf && cpfErro ? "#dc3545" : undefined }}
            />
            {touched.cpf && cpfErro && (
              <small className="cadastro-hint cadastro-hint--erro">{cpfErro}</small>
            )}

            <label htmlFor="telefone">Telefone (opcional)</label>
            <input
              id="telefone"
              name="telefone"
              type="text"
              placeholder="(99) 99999-9999"
              value={formData.telefone}
              onChange={handleChange}
            />

            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Digite seu email"
              value={formData.email}
              onChange={handleChange}
              onBlur={() => handleBlur("email")}
              required
              style={{ borderColor: touched.email && emailErro ? "#dc3545" : undefined }}
            />
            {touched.email && emailErro && (
              <small className="cadastro-hint cadastro-hint--erro">{emailErro}</small>
            )}

            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              name="senha"
              type="password"
              placeholder="Crie sua senha"
              value={formData.senha}
              onChange={handleChange}
              required
            />

            <label htmlFor="confirmarSenha">Confirme a senha</label>
            <input
              id="confirmarSenha"
              name="confirmarSenha"
              type="password"
              placeholder="Confirme sua senha"
              value={formData.confirmarSenha}
              onChange={handleChange}
              onBlur={() => handleBlur("confirmarSenha")}
              required
              style={{
                borderColor: touched.confirmarSenha && senhaErro ? "#dc3545" : undefined,
              }}
            />
            {touched.confirmarSenha && senhaErro && (
              <small className="cadastro-hint cadastro-hint--erro">{senhaErro}</small>
            )}

            <label className="cadastro-aceite" htmlFor="aceiteTermos">
              <input
                id="aceiteTermos"
                type="checkbox"
                checked={aceiteTermos}
                onChange={(e) => setAceiteTermos(e.target.checked)}
                required
              />
              <span>
                Li e aceito os{" "}
                <Link to={ROTAS.termos} target="_blank" rel="noopener noreferrer">
                  termos de uso
                </Link>{" "}
                e a{" "}
                <Link to={ROTAS.privacidade} target="_blank" rel="noopener noreferrer">
                  política de privacidade
                </Link>
                .
              </span>
            </label>

            <button type="submit" className="login-button" disabled={cadastrarDesabilitado}>
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