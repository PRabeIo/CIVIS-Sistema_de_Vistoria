import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../../../services/api";
import "../../../styles/cadastro.css";
import Navbar from "../../../components/Navbar/Navbar"; 

function CadastrarCliente({ onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) return onLogout();
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/login");
  };

  const [formData, setFormData] = useState({
    nome: "",
    cpf: "",
    email: "",
    senha: "",
    confirmarSenha: "",
    telefone: "",
  });

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
    if (!nome || !String(nome).trim()) return "Nome é obrigatório.";
    return "";
  };

  const validarCPF = (cpf) => {
    const somenteNumeros = somenteDigitos(cpf);
    if (!somenteNumeros) return "CPF é obrigatório.";
    if (somenteNumeros.length !== 11) return "CPF inválido.";
    return "";
  };

  const validarEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return "Email é obrigatório.";
    if (!emailRegex.test(email)) return "Digite um email válido. Ex: nome@email.com";
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

    // Nome (validação após tocar)
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

    // Telefone (máscara)
    if (name === "telefone") {
      const raw = value.replace(/\D/g, "");
      const masked = raw
        .replace(/^(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2")
        .slice(0, 15);

      setFormData((prev) => ({ ...prev, telefone: masked }));
      return;
    }

    // Email (lowercase + valida em tempo real)
    if (name === "email") {
      const emailLower = value.toLowerCase();
      setFormData((prev) => ({ ...prev, email: emailLower }));

      if (touched.email) setEmailErro(validarEmail(emailLower));
      return;
    }

    // Senha (revalida confirmar se já tocou)
    if (name === "senha") {
      setFormData((prev) => ({ ...prev, senha: value }));
      if (touched.confirmarSenha) {
        setSenhaErro(validarSenhas(value, formData.confirmarSenha));
      }
      return;
    }

    // Confirmar senha (valida em tempo real)
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

  const handleSubmit = async (e) => {
    e.preventDefault();

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
      await apiFetch("/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: formData.nome,
          cpf: somenteDigitos(formData.cpf),
          email: formData.email,
          senha: formData.senha,
          telefone: somenteDigitos(formData.telefone),
        }),
      });

      alert("Cliente cadastrado com sucesso!");
      navigate("/clientes");
    } catch (error) {
      console.error("Erro ao cadastrar cliente:", error);
      alert(error.message || "Erro ao cadastrar cliente. Tente novamente mais tarde.");
    }
  };

  const salvarDesabilitado = !!nomeErro || !!cpfErro || !!emailErro || !!senhaErro;

  return (
    <div className="home-container cadastro-page">
      <Navbar onLogout={handleLogout} />

      <main className="admin-page-container">
        <h1 className="titulo-centralizado">Cadastrar Cliente</h1>

        <form onSubmit={handleSubmit} className="cadastro-form">
          <div className="cadastro-group">
            <label htmlFor="nome">Nome Completo:</label>
            <input
              type="text"
              id="nome"
              name="nome"
              value={formData.nome}
              onChange={handleChange}
              onBlur={() => handleBlur("nome")}
              required
              style={{ borderColor: nomeErro ? "#dc3545" : undefined }}
            />
            {touched.nome && nomeErro && (
              <small className="cadastro-hint cadastro-hint--erro">{nomeErro}</small>
            )}
          </div>

          <div className="cadastro-group">
            <label htmlFor="cpf">CPF:</label>
            <input
              type="text"
              id="cpf"
              name="cpf"
              value={formData.cpf}
              onChange={handleChange}
              onBlur={() => handleBlur("cpf")}
              required
              style={{ borderColor: cpfErro ? "#dc3545" : undefined }}
            />
            {touched.cpf && cpfErro && (
              <small className="cadastro-hint cadastro-hint--erro">{cpfErro}</small>
            )}
          </div>

          <div className="cadastro-group">
            <label htmlFor="email">Email:</label>
            <input
              type="text"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={() => handleBlur("email")}
              required
              style={{ borderColor: emailErro ? "#dc3545" : undefined }}
            />
            {touched.email && emailErro && (
              <small className="cadastro-hint cadastro-hint--erro">{emailErro}</small>
            )}
          </div>

          <div className="cadastro-group">
            <label htmlFor="senha">Senha:</label>
            <input
              type="password"
              id="senha"
              name="senha"
              value={formData.senha}
              onChange={handleChange}
              required
            />
          </div>

          <div className="cadastro-group">
            <label htmlFor="confirmarSenha">Confirmar Senha:</label>
            <input
              type="password"
              id="confirmarSenha"
              name="confirmarSenha"
              value={formData.confirmarSenha}
              onChange={handleChange}
              onBlur={() => handleBlur("confirmarSenha")}
              required
              style={{ borderColor: senhaErro ? "#dc3545" : undefined }}
            />
            {touched.confirmarSenha && senhaErro && (
              <small className="cadastro-hint cadastro-hint--erro">{senhaErro}</small>
            )}
          </div>

          <div className="cadastro-group">
            <label htmlFor="telefone">Telefone:</label>
            <input
              type="text"
              id="telefone"
              name="telefone"
              value={formData.telefone}
              onChange={handleChange}
            />
          </div>

          <div className="cadastro-actions">
            <button
              type="button"
              className="cadastro-btn cadastro-btn--cancelar"
              onClick={() => navigate("/clientes")}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="cadastro-btn cadastro-btn--salvar"
              disabled={salvarDesabilitado}
            >
              Cadastrar Cliente
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default CadastrarCliente;