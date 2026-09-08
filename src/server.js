require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const alunoRoutes = require('./routes/aluno');
const professorRoutes = require('./routes/professor');
const gestaoRoutes = require('./routes/gestao');

const PORT = process.env.PORT || 4000;
const usarPostgres = Boolean(process.env.DATABASE_URL) && process.env.DB_DRIVER !== 'json';
const origensPermitidas = (process.env.ALLOWED_ORIGINS || '').split(',').map((origem) => origem.trim()).filter(Boolean);

function criarApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set({
      'Content-Security-Policy': "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    });
    next();
  });
  app.use(cors({ origin(origin, callback) {
    if (!origin || origensPermitidas.includes(origin) || (process.env.NODE_ENV !== 'production' && !origensPermitidas.length)) return callback(null, true);
    return callback(null, false);
  } }));
  app.use(express.json());

  app.use('/api/auth', authRoutes);
  app.use('/api/aluno', alunoRoutes);
  app.use('/api/professor', professorRoutes);
  app.use('/api/gestao', gestaoRoutes);

  app.get('/api/health', async (req, res) => {
    try {
      if (usarPostgres) {
        const { pool } = require('./postgres');
        await pool.query('SELECT 1');
      }
      res.json({ ok: true, database: usarPostgres ? 'ok' : 'local' });
    } catch (erro) {
      res.status(503).json({ ok: false, database: 'indisponivel' });
    }
  });

// front-end estático (login.html, aluno.html, professor.html, gestao.html)
  app.use(express.static(path.join(__dirname, '..', 'public')));
  return app;
}

if (require.main === module) {
  criarApp().listen(PORT, () => {
    console.log(`Trilha Paudalho rodando em http://localhost:${PORT}`);
  });
}

module.exports = { criarApp };
