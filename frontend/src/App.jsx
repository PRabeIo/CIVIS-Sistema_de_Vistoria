import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import "./pages/styles/navbar.css";

// Página inicial e login
import Inicial from "./pages/Inicial/Inicial";
import Login from "./pages/Login/login";
import CadastroLogin from "./pages/Cadastro/CadastroLogin";
import Legal from "./pages/Legal/Legal";

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
import Imoveis from "./pages/HomeAdm/Imoveis/Imoveis";
import CadastrarImovel from "./pages/HomeAdm/Imoveis/CadastrarImovel/CadastrarImovel";
import EditarImovel from "./pages/HomeAdm/Imoveis/EditarImovel/EditarImovel";
import VistoriasAgendadas from "./pages/HomeAdm/Vistorias/VistoriaAgendadas/VistoriasAgendadas";
import Clientes from "./pages/HomeAdm/Clientes/Clientes";
import CadastrarCliente from "./pages/HomeAdm/Clientes/CadastrarCliente/CadastrarCliente";
import EditarCliente from "./pages/HomeAdm/Clientes/EditarCliente/EditarCliente";
import PerfilAdministrador from "./pages/HomeAdm/Perfil/PerfilAdministrador";
import EditarPerfilAdministrador from "./pages/HomeAdm/Perfil/EditarPerfilAdministrador";

// Páginas do cliente
import AgendarVistoria from "./pages/HomeCliente/AgendarVistoria/AgendarVistoria";
import ValidarVistoria from "./pages/HomeCliente/ValidarVistoria/ValidarVistoria";
import SolicitarNovaVistoria from "./pages/HomeCliente/SolicitarNovaVistoria/SolicitarNovaVistoria";
import PerfilCliente from "./pages/HomeCliente/Perfil/PerfilCliente";
import EditarPerfilCliente from "./pages/HomeCliente/Perfil/EditarPerfilCliente";
import VistoriaDetalhes from "./pages/HomeCliente/VistoriaDetalhes/VistoriaDetalhes";

// Páginas do vistoriador
import VistoriaDataEntryPage from "./pages/HomeVistoriador/VistoriaData/VistoriaDataEntryPage";
import CriarRelatorioPage from "./pages/HomeVistoriador/CriarRelatorio/CriarRelatorioPage";
import PerfilVistoriador from "./pages/HomeVistoriador/Perfil/PerfilVistoriador";
import EditarPerfilVistoriador from "./pages/HomeVistoriador/Perfil/EditarPerfilVistoriador";
import IniciarVistoriaDetalhesPage from "./pages/HomeVistoriador/IniciarVistoria/IniciarVistoriaDetalhesPage";
import { logoutNoServidor } from "./services/api";
import { ROTAS } from "./rotas";

/** Usuário salvo no login (só dados públicos; a sessão em si está no cookie httpOnly). */
function lerUsuarioSalvo() {
  const stored = localStorage.getItem("usuario");
  if (!stored) return null;
  try {
    const u = JSON.parse(stored);
    // ✅ suporta novo padrão (tipo) e legado (type)
    const tipo = u?.tipo ?? u?.type ?? null;
    return tipo ? { tipo, id: u.id ?? null } : null;
  } catch (e) {
    console.error("Erro ao parsear dados do usuário no localStorage", e);
    localStorage.removeItem("usuario");
    return null;
  }
}

function App() {
  // Lido já na inicialização: se fosse num useEffect, a 1ª renderização (deslogada) redirecionaria
  // para /login ao recarregar qualquer página protegida.
  const [usuarioInicial] = useState(lerUsuarioSalvo);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(usuarioInicial));
  const [userType, setUserType] = useState(usuarioInicial?.tipo ?? null);
  const [, setUserId] = useState(usuarioInicial?.id ?? null);

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
    logoutNoServidor();
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Página Inicial */}
        <Route path={ROTAS.inicial} element={<Inicial />} />
        <Route path={ROTAS.login} element={<Login onLogin={login} />} />
        <Route path={ROTAS.cadastro} element={<CadastroLogin />} />
        <Route path={ROTAS.termos} element={<Legal tipo="termos" />} />
        <Route path={ROTAS.privacidade} element={<Legal tipo="privacidade" />} />

        {/* Rotas protegidas */}
        {isAuthenticated ? (
          <>
            <Route
              path={ROTAS.home}
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
                <Route path={ROTAS.admin.funcionarios} element={<Funcionarios />} />
                <Route path={ROTAS.admin.cadastrarFuncionario} element={<CadastrarFuncionario />} />
                <Route path={ROTAS.admin.editarFuncionario()} element={<EditarFuncionario />} />
                <Route path={ROTAS.admin.empreendimentos} element={<Empreendimentos />} />
                <Route path={ROTAS.admin.cadastrarEmpreendimento} element={<CadastrarEmpreendimento />} />
                <Route path={ROTAS.admin.clientes} element={<Clientes />} />
                <Route path={ROTAS.admin.cadastrarCliente} element={<CadastrarCliente />} />
                <Route path={ROTAS.admin.editarCliente()} element={<EditarCliente />} />
                <Route path={ROTAS.admin.imoveis} element={<Imoveis />} />
                <Route path={ROTAS.admin.cadastrarImovel} element={<CadastrarImovel />} />
                <Route path={ROTAS.admin.editarImovel()} element={<EditarImovel />} />
                <Route path={ROTAS.admin.vistorias} element={<VistoriasAgendadas />} />
                <Route path={ROTAS.admin.vistoriaDetalhes()} element={<VistoriaDetalhes />} />
                <Route path={ROTAS.admin.perfil} element={<PerfilAdministrador />} />
                <Route path={ROTAS.admin.editarPerfil} element={<EditarPerfilAdministrador />} />
              </>
            )}

            {/* Cliente */}
            {userType === "cliente" && (
              <>
                <Route path={ROTAS.cliente.agendarVistoria} element={<AgendarVistoria />} />
                <Route path={ROTAS.cliente.validarVistoria} element={<ValidarVistoria />} />
                <Route path={ROTAS.cliente.vistoria()} element={<VistoriaDetalhes />} />
                <Route path={ROTAS.cliente.reagendarVistoria} element={<SolicitarNovaVistoria />} />
                <Route path={ROTAS.cliente.perfil} element={<PerfilCliente />} />
                <Route path={ROTAS.cliente.editarPerfil} element={<EditarPerfilCliente />} />
              </>
            )}

            {/* Vistoriador */}
            {userType === "vistoriador" && (
              <>
                <Route path={ROTAS.vistoriador.vistoria()} element={<VistoriaDataEntryPage />} />
                <Route path={ROTAS.vistoriador.iniciarVistoria()} element={<IniciarVistoriaDetalhesPage />} />
                <Route path={ROTAS.vistoriador.criarRelatorio()} element={<CriarRelatorioPage />} />
                <Route path={ROTAS.vistoriador.perfil} element={<PerfilVistoriador />} />
                <Route path={ROTAS.vistoriador.editarPerfil} element={<EditarPerfilVistoriador />} />
              </>
            )}

            <Route path="*" element={<Navigate to={ROTAS.home} />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to={ROTAS.login} />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
