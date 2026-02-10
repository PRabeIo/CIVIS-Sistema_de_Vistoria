require('dns').setDefaultResultOrder('ipv4first');
process.env.TZ = 'America/Sao_Paulo';
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const funcionariosRoutes = require('./models/Funcionario');
const administradoresRoutes = require('./models/Administrador');
const loginRoutes = require('./routes/login');
const relatorioRoutes = require('./routes/relatorio.routes');
const empreendimentoRoutes = require('./models/Empreendimento');
const imoveisRoutes = require('./models/Imovel');
const vistoriadoresRoutes = require('./models/Vistoriador');
const clientesRoutes = require('./models/Cliente');
const vistoriasRoutes = require('./models/Vistoria');
const vistorias1Routes = require('./routes/vistorias');
const emailService = require('./enviarEmail');

const app = express();
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos
app.use('/uploads', express.static('uploads'));
app.use('/relatorios', express.static('relatorios')); // <-- Adicionado
app.use('/uploads/funcionarios', express.static('uploads/funcionarios'));

// Rotas
app.use('/api/funcionarios', funcionariosRoutes);
app.use('/api/vistorias', vistorias1Routes);
app.use('/api/administradores', administradoresRoutes);
app.use('/api', loginRoutes);
app.use('/api/relatorio', relatorioRoutes);
app.use('/api/empreendimentos', empreendimentoRoutes);
app.use('/api/imoveis', imoveisRoutes);
app.use('/api/vistoriadores', vistoriadoresRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/vistorias', vistoriasRoutes);

const PORT = process.env.PORT || 3001;
(async () => {
  await emailService.criarTransporter();
})();

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});