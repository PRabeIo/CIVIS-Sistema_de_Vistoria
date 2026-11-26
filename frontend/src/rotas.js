// B10: endereços das telas num só lugar. App.jsx monta as rotas a partir daqui e o teste
// src/test/rotas.test.js garante que todo link/navigate do código aponta para uma rota existente.

export const ROTAS = {
  inicial: "/",
  login: "/login",
  cadastro: "/cadastro-login",
  home: "/home", // a home muda conforme o papel

  admin: {
    funcionarios: "/funcionarios",
    cadastrarFuncionario: "/cadastrar-funcionario",
    editarFuncionario: (id = ":id") => `/editar-funcionario/${id}`,
    empreendimentos: "/empreendimentos",
    cadastrarEmpreendimento: "/cadastrar-empreendimento",
    clientes: "/clientes",
    cadastrarCliente: "/cadastrar-cliente",
    editarCliente: (id = ":id") => `/editar-cliente/${id}`,
    imoveis: "/imoveis",
    cadastrarImovel: "/cadastrar-imovel",
    editarImovel: (id = ":id") => `/editar-imovel/${id}`,
    vistorias: "/vistorias-agendadas",
    vistoriaDetalhes: (id = ":id") => `/vistoria-detalhes/${id}`,
    perfil: "/admin/perfil",
    editarPerfil: "/admin/editar-perfil",
  },

  cliente: {
    agendarVistoria: "/agendar-vistoria",
    validarVistoria: "/validar-vistoria",
    vistoria: (id = ":id") => `/cliente/vistoria/${id}`,
    reagendarVistoria: "/reagendar-vistoria",
    perfil: "/perfil-cliente",
    editarPerfil: "/editar-perfil-cliente",
  },

  vistoriador: {
    vistoria: (id = ":id") => `/vistoriador/vistoria/${id}`,
    iniciarVistoria: (id = ":id") => `/vistoriador/iniciar-vistoria-detalhes/${id}`,
    criarRelatorio: (id = ":id") => `/vistoriador/criar-relatorio/${id}`,
    perfil: "/vistoriador/perfil",
    editarPerfil: "/vistoriador/editar-perfil",
  },
};

/** Padrões (com ":id") de todas as rotas de um grupo, para o App e o teste de links. */
export function padroes(grupo) {
  return Object.values(grupo).flatMap((v) => (typeof v === "function" ? [v()] : typeof v === "string" ? [v] : []));
}

export const ROTAS_PUBLICAS = [ROTAS.inicial, ROTAS.login, ROTAS.cadastro];
export const ROTAS_POR_PAPEL = {
  admin: [ROTAS.home, ...padroes(ROTAS.admin)],
  cliente: [ROTAS.home, ...padroes(ROTAS.cliente)],
  vistoriador: [ROTAS.home, ...padroes(ROTAS.vistoriador)],
};
