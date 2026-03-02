const emailService = require('../enviarEmail');

async function initEmail() {
  await emailService.criarTransporter();
}

module.exports = { initEmail };
