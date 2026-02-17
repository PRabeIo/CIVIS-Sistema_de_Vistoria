import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../Home.css";
import "../Funcionarios.css";
import { apiFetch } from "../../../../services/api";

function CadastrarFuncionario() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const doLogout = () => {
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
    cargo: "",
  });

  // erros visíveis embaixo do campo
  const [cpfErro, setCpfErro] = useState("");
  const [emailErro, setEmailErro] = useState("");
  const [senhaErro, setSenhaErro] = useState("");

  // opcional: só exibir mensagem depois que o usuário tocar no campo
  const [touched, setTouched] = useState({
    cpf: false,
    email: false,
    confirmarSenha: false,
  });

  const validarCPF = (cpf) => {
    const somenteNumeros = String(cpf || "").replace(/\D/g, "");
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

  // mantém validação sempre atualizada (quando senha muda, revalida confirmar)
  useEffect(() => {
    if (touched.confirmarSenha) {
      setSenhaErro(validarSenhas(formData.senha, formData.confirmarSenha));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.senha]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // CPF (máscara + validação de 11 dígitos)
    if (name === "cpf") {
      const raw = value.replace(/\D/g, "");
      const masked = raw
        .replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4")
        .slice(0, 14);

      setFormData((prev) => ({ ...prev, cpf: masked }));

      if (touched.cpf) {
        setCpfErro(validarCPF(masked));
      }
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

      if (touched.email) {
        setEmailErro(validarEmail(emailLower));
      }
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

    if (field === "cpf") {
      setCpfErro(validarCPF(formData.cpf));
    }

    if (field === "email") {
      setEmailErro(validarEmail(formData.email));
    }

    if (field === "confirmarSenha") {
      setSenhaErro(validarSenhas(formData.senha, formData.confirmarSenha));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // garante que os erros vão aparecer caso o user tente salvar sem tocar nos campos
    setTouched({ cpf: true, email: true, confirmarSenha: true });

    const erroCpf = validarCPF(formData.cpf);
    const erroEmail = validarEmail(formData.email);
    const erroSenha = validarSenhas(formData.senha, formData.confirmarSenha);

    setCpfErro(erroCpf);
    setEmailErro(erroEmail);
    setSenhaErro(erroSenha);

    if (erroCpf || erroEmail || erroSenha) return;

    try {
      await apiFetch("/funcionarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: formData.nome,
          cpf: formData.cpf,
          email: formData.email,
          senha: formData.senha,
          telefone: formData.telefone,
          cargo: formData.cargo,
        }),
      });

      alert("Funcionário cadastrado com sucesso!");
      navigate("/funcionarios");
    } catch (error) {
      console.error("Erro ao cadastrar funcionário:", error);
      alert(error.message || "Erro ao cadastrar funcionário. Tente novamente mais tarde.");
    }
  };

  const salvarDesabilitado = !!cpfErro || !!emailErro || !!senhaErro;

  return (
    <div className="home-container">
      {/* ✅ Navbar padrão CIVIS (hamburguer) */}
      <header className="navbar">
        <div className="logo">CIVIS</div>

        <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
          <a href="#" onClick={() => navigate("/home")}>Home</a>
          <a href="#" onClick={() => navigate("/nova-vistoria")}>Nova Vistoria</a>
          <a href="#" onClick={() => navigate("/vistorias-agendadas")}>Vistorias Agendadas</a>
          <a href="#" onClick={() => navigate("/clientes")}>Clientes</a>
          <a href="#" onClick={() => navigate("/empreendimentos")}>Empreendimentos</a>
          <a href="#" onClick={() => navigate("/funcionarios")}>Funcionários</a>

          <button className="logout-button mobile-logout" onClick={doLogout}>
            Sair
          </button>
        </nav>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          ☰
        </button>

        <button className="logout-button desktop-logout" onClick={doLogout}>
          Sair
        </button>
      </header>

      <main className="admin-page-container">
        <h1 className="titulo-centralizado">Cadastrar Novo Funcionário</h1>

        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-group">
            <label htmlFor="nome">Nome Completo:</label>
            <input
              type="text"
              id="nome"
              name="nome"
              value={formData.nome}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
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
              <small style={{ color: "#dc3545", fontWeight: 600, display: "block", marginTop: 6 }}>
                {cpfErro}
              </small>
            )}
          </div>

          <div className="form-group">
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
              <small style={{ color: "#dc3545", fontWeight: 600, display: "block", marginTop: 6 }}>
                {emailErro}
              </small>
            )}
          </div>

          <div className="form-group">
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

          <div className="form-group">
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
              <small style={{ color: "#dc3545", fontWeight: 600, display: "block", marginTop: 6 }}>
                {senhaErro}
              </small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="telefone">Telefone:</label>
            <input
              type="text"
              id="telefone"
              name="telefone"
              value={formData.telefone}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="cargo">Cargo:</label>
            <select
              id="cargo"
              name="cargo"
              value={formData.cargo}
              onChange={handleChange}
              required
            >
              <option value="">Selecione</option>
              <option value="Administrador">Administrador</option>
              <option value="Vistoriador">Vistoriador</option>
            </select>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-cancelar"
              onClick={() => navigate("/funcionarios")}
            >
              Cancelar
            </button>

            <button type="submit" className="btn-salvar" disabled={salvarDesabilitado}>
              Salvar Funcionário
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default CadastrarFuncionario;
