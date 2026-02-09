import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Pagina Inicial e Login
import Inicial from "./pages/Inicial/Inicial";
import Login from "./pages/Login/Login";
import CadastroLogin from "./pages/Login/CadastroLogin";

// Home de cada tipo de usuario
import HomeAdm from "./pages/HomeAdm/Home";
import HomeCliente from "./pages/HomeCliente/Home";
import HomeVistoriador from "./pages/HomeVistoriador/Home";

// Páginas de Vistoria (Admin)
import NovaVistoria from "./pages/HomeAdm/Vistorias/NovaVistoria";
import VistoriasAgendadas from "./pages/HomeAdm/Vistorias/VistoriasAgendadas";
import VistoriaDetalhes from "./pages/HomeAdm/Vistorias/VistoriaDetalhes";

// Páginas de Vistoria (Vistoriador)
import VistoriaDataEntryPage from "./pages/HomeVistoriador/VistoriaDataEntryPage";
// Importa a página AgendarVistoria
import AgendarVistoria from "./pages/HomeCliente/AgendarVistoria";

function App() {
  return (
    <Router>
      <Routes>
        {/* Páginas iniciais e login */}
        <Route path="/" element={<Inicial />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<CadastroLogin />} />

        {/* Home por tipo de usuário */}
        <Route path="/home" element={<HomeAdm />} />
        <Route path="/home-cliente" element={<HomeCliente />} />
        <Route path="/home-vistoriador" element={<HomeVistoriador />} />

        {/* Rota nova para Agendar Vistoria */}
        <Route path="/agendar-vistoria" element={<AgendarVistoria />} />

        {/* Vistoria - Admin */}
        <Route path="/nova-vistoria" element={<NovaVistoria />} />
        <Route path="/vistorias-agendadas" element={<VistoriasAgendadas />} />
        <Route path="/vistorias-agendadas/:id" element={<VistoriaDetalhes />} />

        {/* Vistoria - Vistoriador */}
        <Route path="/vistoriador/vistoria/:id" element={<VistoriaDataEntryPage />} />

        {/* Outras rotas de vistoriador futuramente */}
      </Routes>
    </Router>
  );
}

export default App;
