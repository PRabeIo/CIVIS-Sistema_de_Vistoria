const nodemailer = require("nodemailer");
require("dotenv").config();

// Transporter com host + porta 587 + secure false
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Teste de conexão SMTP
transporter.verify(function (error, success) {
  if (error) {
    console.error("Erro na configuração do e-mail:", error);
  } else {
    console.log("Servidor de e-mail pronto para envio.");
  }
});

// Envia o relatório técnico com anexo
async function enviarEmailRelatorio(destino, nomeArquivo, caminhoDoArquivo) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: destino,
    subject: "Relatório de Vistoria",
    text: "Segue em anexo o relatório gerado.",
    attachments: [
      {
        filename: nomeArquivo,
        path: caminhoDoArquivo,
      },
    ],
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email de relatório enviado:", info.response);
  } catch (error) {
    console.error("Erro ao enviar e-mail de relatório:", error);
    throw error;
  }
}

// Envia notificação de agendamento de vistoria
async function enviarEmailAgendamento({ para, nomeCliente, endereco, nomeVistoriador, tipo = "vistoriador" }) {
  let subject, text;

  if (tipo === "cliente") {
    subject = "Confirmação de Agendamento de Vistoria";
    text = `Olá ${nomeCliente},

Sua vistoria foi criada com sucesso para o imóvel localizado em: ${endereco}.

Responsável pela vistoria: ${nomeVistoriador}

Por favor, organize e escolha a data que a vistoria será realizada.

Atenciosamente,
Sistema CIVIS`;
  } else {
    subject = "Nova Vistoria Agendada";
    text = `Olá,

Uma nova vistoria foi agendada para o imóvel localizado em: ${endereco}.

Responsável pela vistoria: ${nomeVistoriador}
Cliente: ${nomeCliente}

Por favor, fique atento ao cronograma da vistoria que será definido pelo cliente.

Atenciosamente,
Sistema CIVIS`;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: para,
    subject,
    text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email de agendamento enviado:", info.response);
  } catch (error) {
    console.error("Erro ao enviar e-mail de agendamento:", error);
    throw error;
  }
}

// ✅ Novo: Envia e-mail ao vistoriador quando o cliente solicita vistoria
async function enviarEmailSolicitacaoVistoria({ para, nomeCliente, endereco }) {
  const subject = "Solicitação de Vistoria Recebida";
  const text = `Olá,

O cliente ${nomeCliente} solicitou a realização de uma vistoria para o imóvel localizado em: ${endereco}.

Por favor, programe a vistoria conforme disponibilidade.

Atenciosamente,
Sistema CIVIS`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: para,
    subject,
    text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email de solicitação de vistoria enviado:", info.response);
  } catch (error) {
    console.error("Erro ao enviar e-mail de solicitação de vistoria:", error);
    throw error;
  }
}

module.exports = {
  enviarEmailRelatorio,
  enviarEmailAgendamento,
  enviarEmailSolicitacaoVistoria, // nova função exportada
};
