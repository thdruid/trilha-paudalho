require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./postgres');

const contas = [
  ['mariajulia@aluno.paudalho.pe.gov.br', process.env.PILOT_ALUNO_PASSWORD],
  ['carlos.andrade@seduc.paudalho.pe.gov.br', process.env.PILOT_PROFESSOR_PASSWORD],
  ['gestao@seduc.paudalho.pe.gov.br', process.env.PILOT_GESTOR_PASSWORD],
];

async function trocarSenhas() {
  if (contas.some(([, senha]) => !senha || senha.length < 12)) throw new Error('Defina as três senhas de piloto com ao menos 12 caracteres.');
  for (const [email, senha] of contas) {
    const resultado = await pool.query('UPDATE usuarios SET senha_hash = $1 WHERE email = $2', [bcrypt.hashSync(senha, 12), email]);
    if (resultado.rowCount !== 1) throw new Error(`Conta de piloto não encontrada: ${email}`);
  }
  console.log('Senhas de piloto atualizadas.');
}

trocarSenhas().catch((erro) => {
  console.error(erro.message);
  process.exitCode = 1;
}).finally(() => pool.end());
