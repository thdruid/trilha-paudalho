const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { readDB, writeDB } = require('../db');
const { gerarToken } = require('../auth');
const { enviarRecuperacao } = require('../email');

const router = express.Router();

const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas de login. Tente novamente em alguns minutos.' },
});

router.post('/login', limiteLogin, async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ erro: 'Informe e-mail e senha.' });
  }

  const db = await readDB();
  const usuario = db.usuarios.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (!usuario || !bcrypt.compareSync(senha, usuario.senha_hash)) {
    return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
  }

  const token = gerarToken(usuario);
  res.json({
    token,
    usuario: { id: usuario.id, nome: usuario.nome, papel: usuario.papel, email: usuario.email },
  });
});

router.post('/recuperar-senha', limiteLogin, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const db = await readDB(); const usuario = db.usuarios.find((item) => item.email.toLowerCase() === email);
  if (usuario) {
    const token = crypto.randomBytes(32).toString('hex'); const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const registro = { token_hash: tokenHash, usuario_id: usuario.id, expira_em: new Date(Date.now() + 30 * 60 * 1000).toISOString(), usado_em: null };
    if (process.env.DATABASE_URL && process.env.DB_DRIVER !== 'json') {
      const { pool } = require('../postgres'); await pool.query('INSERT INTO recuperacoes_senha (token_hash, usuario_id, expira_em) VALUES ($1,$2,$3)', [registro.token_hash, registro.usuario_id, registro.expira_em]);
    } else { db.recuperacoes_senha = db.recuperacoes_senha || []; db.recuperacoes_senha.push(registro); await writeDB(db); }
    await enviarRecuperacao(usuario.email, `${process.env.APP_URL || 'http://localhost:4000'}/redefinir-senha.html?token=${token}`);
  }
  res.json({ mensagem: 'Se o e-mail estiver cadastrado, você receberá instruções de recuperação.' });
});

router.post('/redefinir-senha', limiteLogin, async (req, res) => {
  const tokenHash = crypto.createHash('sha256').update(String(req.body.token || '')).digest('hex'); const senha = String(req.body.senha || '');
  if (senha.length < 12) return res.status(400).json({ erro: 'Use uma senha com pelo menos 12 caracteres.' });
  const hash = bcrypt.hashSync(senha, 10);
  if (process.env.DATABASE_URL && process.env.DB_DRIVER !== 'json') {
    const { pool } = require('../postgres'); const resultado = await pool.query('UPDATE recuperacoes_senha SET usado_em = NOW() WHERE token_hash = $1 AND usado_em IS NULL AND expira_em > NOW() RETURNING usuario_id', [tokenHash]);
    if (!resultado.rowCount) return res.status(400).json({ erro: 'Link inválido ou expirado.' });
    await pool.query('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [hash, resultado.rows[0].usuario_id]);
  } else {
    const db = await readDB(); const registro = (db.recuperacoes_senha || []).find((item) => item.token_hash === tokenHash && !item.usado_em && new Date(item.expira_em) > new Date());
    if (!registro) return res.status(400).json({ erro: 'Link inválido ou expirado.' });
    db.usuarios.find((item) => item.id === registro.usuario_id).senha_hash = hash; registro.usado_em = new Date().toISOString(); await writeDB(db);
  }
  res.json({ mensagem: 'Senha redefinida. Entre com a nova senha.' });
});

module.exports = router;
