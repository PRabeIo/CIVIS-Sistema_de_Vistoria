
export const NAV_BY_TIPO = {
  admin: [
    { label: "Home", to: "/home" },
    { label: "Empreendimentos", to: "/empreendimentos" },
    { label: "Funcionários", to: "/funcionarios" },
    { label: "Clientes", to: "/clientes" },
    { label: "Perfil", to: "/admin/perfil" },
  ],

  vistoriador: [
    { label: "Home", to: "/home" },
    { label: "Perfil", to: "/vistoriador/perfil" },
  ],

  cliente: [
    { label: "Home", to: "/home" },
    { label: "Agendar Vistoria", to: "/agendar-vistoria" },
    { label: "Validar Vistoria", to: "/validar-vistoria" },
    { label: "Perfil", to: "/perfil-cliente" },
  ],
};