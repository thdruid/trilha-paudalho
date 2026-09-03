const express = require('express');
const bcrypt = require('bcryptjs');
const { readDB } = require('../db');
const { gerarToken } = require('../auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ erro: 'Informe e-mail e senha.' });
  }

  const db = readDB();
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

module.exports = router;
