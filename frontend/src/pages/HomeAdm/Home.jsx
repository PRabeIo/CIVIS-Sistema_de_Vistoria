import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./home.css";
import Navbar from "../components/Navbar/Navbar";
import { apiFetch } from "../../services/api";
import { ROTAS } from "../../rotas";

const EM_ANALISE = "Em Análise do Admin";

function HomeAdm({ onLogout }) {
  const navigate = useNavigate();
  const [emAnalise, setEmAnalise] = useState(0);

  // F2: avisa quando há vistorias esperando decisão do admin (rejeitadas além do limite de revisões)
  useEffect(() => {
    apiFetch("/vistorias")
      .then((lista) => setEmAnalise(Array.isArray(lista) ? lista.filter((v) => v.status === EM_ANALISE).length : 0))
      .catch(() => {});
  }, []);

  return (
    <div className="home-container">
      {/* ✅ NAVBAR REUTILIZÁVEL */}
      <Navbar onLogout={onLogout} />

      {emAnalise > 0 ? (
        <div className="aviso-analise" role="status">
          <span>
            {emAnalise === 1
              ? "1 vistoria aguarda sua análise (o cliente rejeitou o relatório além do limite de correções)."
              : `${emAnalise} vistorias aguardam sua análise (o cliente rejeitou o relatório além do limite de correções).`}
          </span>
          <button type="button" onClick={() => navigate(ROTAS.admin.vistorias, { state: { status: EM_ANALISE } })}>
            Ver vistorias
          </button>
        </div>
      ) : null}

      <main className="main-content">
        <div className="texto">
          <h1>
            Bem-vindo ao <br /> <span>CIVIS Administrador</span>
          </h1>
          <p>
            Gerencie, acompanhe e realize vistorias de forma rápida, prática e
            eficiente com o <strong>CIVIS</strong>.
          </p>
        </div>

        <div className="imagem">
          <img src="/imagens/vistoria.png" alt="Imagem Vistoria" />
        </div>
      </main>

      <section className="atalhos">
        <h2>Gerenciamento Rápido</h2>

        <div className="atalhos-cards">
          <div className="card" onClick={() => navigate("/vistorias-agendadas")}>
            <img src="/assets/agendada.png" alt="Vistorias" />
            <h3>Vistorias</h3>
          </div>

          <div className="card" onClick={() => navigate("/clientes")}>
            <img src="/assets/cliente.png" alt="Clientes" />
            <h3>Clientes</h3>
          </div>

          <div className="card" onClick={() => navigate("/empreendimentos")}>
            <img src="/assets/empreendimentos.png" alt="Empreendimentos" />
            <h3>Empreendimentos</h3>
          </div>

          <div className="card" onClick={() => navigate("/funcionarios")}>
            <img src="/assets/funcionario.jpg" alt="Funcionário" />
            <h3>Funcionário</h3>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomeAdm;