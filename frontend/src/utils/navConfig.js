import { ROTAS } from "../rotas";

export const NAV_BY_TIPO = {
  admin: [
    { label: "Home", to: ROTAS.home },
    { label: "Vistorias", to: ROTAS.admin.vistorias },
    { label: "Empreendimentos", to: ROTAS.admin.empreendimentos },
    { label: "Funcionários", to: ROTAS.admin.funcionarios },
    { label: "Clientes", to: ROTAS.admin.clientes },
    { label: "Perfil", to: ROTAS.admin.perfil },
  ],

  vistoriador: [
    { label: "Home", to: ROTAS.home },
    { label: "Perfil", to: ROTAS.vistoriador.perfil },
  ],

  cliente: [
    { label: "Home", to: ROTAS.home },
    { label: "Agendar Vistoria", to: ROTAS.cliente.agendarVistoria },
    { label: "Validar Vistoria", to: ROTAS.cliente.validarVistoria },
    { label: "Perfil", to: ROTAS.cliente.perfil },
  ],
};
