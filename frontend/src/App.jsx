import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";

// Página inicial e login
import Inicial from "./pages/Inicial/Inicial";
import Login from "./pages/Login/login";
import CadastroLogin from "./pages/Cadastro/CadastroLogin";

// Home de cada tipo de usuário
import HomeAdm from "./pages/HomeAdm/Home";
import HomeCliente from "./pages/HomeCliente/HomeCliente";
import HomeVistoriador from "./pages/HomeVistoriador/Home";

// Páginas do administrador
import Funcionarios from "./pages/HomeAdm/Funcionarios/Funcionarios";
import CadastrarFuncionario from "./pages/HomeAdm/Funcionarios/CadastroFuncionario/CadastrarFuncionario";
import EditarFuncionario from "./pages/HomeAdm/Funcionarios/EditarFuncionario/EditarFuncionario";
import Empreendimentos from "./pages/HomeAdm/Empreendimentos/Empreendimentos";
import CadastrarEmpreendimento from "./pages/HomeAdm/Empreendimentos/CadastroEmpreendimento/CadastrarEmpreendimento";
import EditarEmpreendimento from "./pages/HomeAdm/Empreendimentos/EditarEmpreendimento/EditarEmpreendimento";
import Imoveis from "./pages/HomeAdm/Imoveis/Imoveis";
import CadastrarImovel from "./pages/HomeAdm/Imoveis/CadastrarImovel/CadastrarImovel";
import EditarImovel from "./pages/HomeAdm/Imoveis/EditarImovel/EditarImovel";
import VistoriasAgendadas from "./pages/HomeAdm/Vistorias/VistoriaAgendadas/VistoriasAgendadas";
import NovaVistoria from "./pages/HomeAdm/Vistorias/NovaVistoria/NovaVistoria";
import Clientes from "./pages/HomeAdm/Clientes/Clientes";
import CadastrarCliente from "./pages/HomeAdm/Clientes/CadastrarCliente/CadastrarCliente";
import EditarCliente from "./pages/HomeAdm/Clientes/EditarCliente/EditarCliente";
import PerfilAdministrador from "./pages/HomeAdm/Perfil/PerfilAdministrador";
import EditarPerfilAdministrador from "./pages/HomeAdm/Perfil/EditarPerfilAdministrador";

// Páginas do cliente
import MeusImoveis from "./pages/HomeCliente/MeuImovel(OFF)/MeuImovel ";
import ImovelDetalhado from "./pages/HomeCliente/ImovelDetalhado(OFF)/ImovelDetalhado";
import MinhasVistorias from "./pages/HomeCliente/MinhasVistorias (OFF)/MinhasVistorias";
import AgendarVistoria from "./pages/HomeCliente/AgendarVistoria/AgendarVistoria";
import ValidarVistoria from "./pages/HomeCliente/ValidarVistoria/ValidarVistoria";
import SolicitarNovaVistoria from "./pages/HomeCliente/SolicitarNovaVistoria/SolicitarNovaVistoria";
import PerfilCliente from './pages/HomeCliente//Perfil/PerfilCliente';
import EditarPerfilCliente from "./pages/HomeCliente/Perfil/EditarPerfilCliente";
import VistoriaDetalhes from "./pages/HomeCliente/VistoriaDetalhes/VistoriaDetalhes";

// Páginas do vistoriador
import VistoriaDataEntryPage from "./pages/HomeVistoriador/VistoriaData/VistoriaDataEntryPage";
import ReagendarVistoriaPage from "./pages/HomeVistoriador/ReagendarVistoria(OFF)/ReagendarVistoriaPage";
import CriarRelatorioPage from "./pages/HomeVistoriador/CriarRelatorio/CriarRelatorioPage";
import HistoricoVistoriasPage from "./pages/HomeVistoriador/HistoricoVistorias(OFF)/HistoricoVistoriasPage";
import PerfilVistoriador from "./pages/HomeVistoriador/Perfil/PerfilVistoriador";
import EditarPerfilVistoriador from "./pages/HomeVistoriador/Perfil/EditarPerfilVistoriador";
import IniciarVistoriaDetalhesPage from "./pages/HomeVistoriador/IniciarVistoria/IniciarVistoriaDetalhesPage";

const NotificarClientePage = () => (
  <div>
    <h1>Página de Notificação de Clientes</h1>
    <p>Envie mensagens ou alertas para clientes.</p>
  </div>
);

// ... no topo, imports iguais

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("usuario");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setIsAuthenticated(true);

        // ✅ suporta novo padrão (tipo) e legado (type)
        const tipo = userData.tipo ?? userData.type ?? null;
        setUserType(tipo);

        setUserId(userData.id ?? null);
      } catch (e) {
        console.error("Erro ao parsear dados do usuário no localStorage", e);
        localStorage.removeItem("usuario");
        localStorage.removeItem("token");
        setIsAuthenticated(false);
        setUserType(null);
        setUserId(null);
      }
    }
  }, []);

  // ✅ padroniza para "tipo"
  const login = (tipo, id) => {
    setIsAuthenticated(true);
    setUserType(tipo);
    setUserId(id);

    // mantém o cargo se já estiver salvo pelo Login.jsx
    const stored = localStorage.getItem("usuario");
    let cargo = null;
    if (stored) {
      try {
        cargo = JSON.parse(stored)?.cargo ?? null;
      } catch (_) {}
    }

    localStorage.setItem("usuario", JSON.stringify({ tipo, id, cargo }));
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserType(null);
    setUserId(null);
    localStorage.removeItem("usuario");
    localStorage.removeItem("token");
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Página Inicial */}
        <Route path="/" element={<Inicial />} />
        <Route path="/login" element={<Login onLogin={login} />} />
        <Route path="/cadastro-login" element={<CadastroLogin />} />

        {/* Rotas protegidas */}
        {isAuthenticated ? (
          <>
            <Route
              path="/home"
              element={
                userType === "admin" ? (
                  <HomeAdm onLogout={logout} />
                ) : userType === "cliente" ? (
                  <HomeCliente onLogout={logout} />
                ) : userType === "vistoriador" ? (
                  <HomeVistoriador onLogout={logout} />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />

            {/* Admin */}
            {userType === "admin" && (
              <>
                <Route path="/funcionarios" element={<Funcionarios />} />
                <Route path="/cadastrar-funcionario" element={<CadastrarFuncionario />} />
                <Route path="/editar-funcionario/:id" element={<EditarFuncionario />} />
                <Route path="/empreendimentos" element={<Empreendimentos />} />
                <Route path="/cadastrar-empreendimento" element={<CadastrarEmpreendimento />} />
                <Route path="/editar-empreendimento/:id" element={<EditarEmpreendimento />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/cadastrar-cliente" element={<CadastrarCliente />} />
                <Route path="/editar-cliente/:id" element={<EditarCliente />} />
                <Route path="/imoveis" element={<Imoveis />} />
                <Route path="/cadastrar-imovel" element={<CadastrarImovel />} />
                <Route path="/editar-imovel/:id" element={<EditarImovel />} />
                <Route path="/vistorias-agendadas" element={<VistoriasAgendadas />} />
                <Route path="/nova-vistoria" element={<NovaVistoria />} />
                <Route path="/vistoria-detalhes/:id" element={<VistoriaDetalhes />} />
                <Route path={`/admin/perfil-administrador/${userId}`} element={<PerfilAdministrador />} />
                <Route path={`/admin/editar-perfil/${userId}`} element={<EditarPerfilAdministrador />} />
              </>
            )}

            {/* Cliente */}
            {userType === "cliente" && (
              <>
                <Route path="/meus-imoveis" element={<MeusImoveis />} />
                <Route path="/imovel-detalhado/:id" element={<ImovelDetalhado />} />
                <Route path="/minhas-vistorias" element={<MinhasVistorias />} />
                <Route path="/agendar-vistoria" element={<AgendarVistoria />} />
                <Route path="/validar-vistoria" element={<ValidarVistoria />} />
                <Route path="/cliente/vistoria/:id" element={<VistoriaDetalhes />} />
                <Route path="/reagendar-vistoria" element={<SolicitarNovaVistoria />} />
                <Route path="/perfil-cliente" element={<PerfilCliente />} />
                <Route path="/editar-perfil-cliente" element={<EditarPerfilCliente />} />
              </>
            )}

            {/* Vistoriador */}
            {userType === "vistoriador" && (
              <>
                <Route path="/vistoriador/vistoria/:id" element={<VistoriaDataEntryPage />} />
                <Route path="/vistoriador/iniciar-vistoria-detalhes/:id" element={<IniciarVistoriaDetalhesPage />} />
                <Route path="/vistoriador/criar-relatorio/:id" element={<CriarRelatorioPage />} />
                <Route path="/vistoriador/notificar-cliente" element={<NotificarClientePage />} />
                <Route path="/vistoriador/reagendar-vistoria/:id" element={<ReagendarVistoriaPage />} />
                <Route path={`/vistoriador/historico/${userId}`} element={<HistoricoVistoriasPage />} />
                <Route path={`/vistoriador/perfil-vistoriador/${userId}`} element={<PerfilVistoriador />} />
                <Route path={`/vistoriador/editar-perfil-vistoriador/${userId}`} element={<EditarPerfilVistoriador />} />
              </>
            )}

            <Route path="*" element={<Navigate to="/home" />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/login" />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
