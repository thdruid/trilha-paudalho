const nodemailer = require('nodemailer');

function configurado() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);
}

async function enviarRecuperacao(destino, link) {
  if (!configurado()) return false;
  const transporte = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
  await transporte.sendMail({ from: process.env.SMTP_FROM, to: destino, subject: 'Redefinição de senha — Trilha Paudalho', text: `Use este link em até 30 minutos para redefinir sua senha: ${link}` });
  return true;
}

module.exports = { configurado, enviarRecuperacao };
