const nodemailer = require("nodemailer");

let transporter;

// 🔹 Cria o transporter Ethereal automaticamente
async function criarTransporter() {
  const testAccount = await nodemailer.createTestAccount();

  transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  console.log("Ethereal pronto para envio de e-mails.");
}

// B13: se o provedor não subiu, o envio falha com mensagem clara (a API continua no ar).
function transporterPronto() {
  if (!transporter) throw new Error("Serviço de e-mail indisponível.");
  return transporter;
}

// Envia o relatório técnico com anexo
async function enviarEmailRelatorio(destino, nomeArquivo, caminhoDoArquivo) {
  const mailOptions = {
    from: '"Sistema CIVIS" <no-reply@civis.com>',
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
    const info = await transporterPronto().sendMail(mailOptions);
    console.log("Ver email em:", nodemailer.getTestMessageUrl(info));
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
    from: '"Sistema CIVIS" <no-reply@civis.com>',
    to: para,
    subject,
    text,
  };

  try {
    const info = await transporterPronto().sendMail(mailOptions);
    console.log("Ver email em:", nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error("Erro ao enviar e-mail de agendamento:", error);
    throw error;
  }
}

// Envia e-mail ao vistoriador quando o cliente solicita vistoria
async function enviarEmailSolicitacaoVistoria({ para, nomeCliente, endereco }) {
  const subject = "Solicitação de Vistoria Recebida";
  const text = `Olá,

O cliente ${nomeCliente} solicitou a realização de uma vistoria para o imóvel localizado em: ${endereco}.

Por favor, programe a vistoria conforme disponibilidade.

Atenciosamente,
Sistema CIVIS`;

  const mailOptions = {
    from: '"Sistema CIVIS" <no-reply@civis.com>',
    to: para,
    subject,
    text,
  };

  try {
    const info = await transporterPronto().sendMail(mailOptions);
    console.log("Ver email em:", nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error("Erro ao enviar e-mail de solicitação de vistoria:", error);
    throw error;
  }
}

module.exports = {
  criarTransporter,
  enviarEmailRelatorio,
  enviarEmailAgendamento,
  enviarEmailSolicitacaoVistoria,
};
