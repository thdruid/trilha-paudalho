const { pool } = require('./postgres');

async function readDB() {
  const [escolas, turmas, usuarios, trilhas, missoes, progresso, conquistas, usuarioConquistas, acessos, streaks, feedbacks] = await Promise.all([
    pool.query('SELECT * FROM escolas ORDER BY id'), pool.query('SELECT * FROM turmas ORDER BY id'), pool.query('SELECT * FROM usuarios ORDER BY id'),
    pool.query('SELECT * FROM trilhas ORDER BY id'), pool.query('SELECT * FROM missoes ORDER BY id'), pool.query('SELECT * FROM progresso'),
    pool.query('SELECT * FROM conquistas ORDER BY id'), pool.query('SELECT * FROM usuario_conquistas'), pool.query('SELECT * FROM ultimo_acesso'), pool.query('SELECT * FROM streak'),
    pool.query('SELECT * FROM feedbacks ORDER BY criado_em DESC'),
  ]);
  return {
    escolas: escolas.rows,
    turmas: turmas.rows,
    usuarios: usuarios.rows.map((u) => ({ ...u, turmas_ids: u.turmas_ids || [] })),
    trilhas: trilhas.rows,
    missoes: missoes.rows.map((m) => ({ ...m, blocos: m.blocos, ordem_correta: m.ordem_correta })),
    progresso: progresso.rows,
    conquistas: conquistas.rows,
    usuario_conquistas: usuarioConquistas.rows,
    ultimo_acesso: Object.fromEntries(acessos.rows.map((a) => [a.usuario_id, a.acessado_em])),
    streak: Object.fromEntries(streaks.rows.map((s) => [s.usuario_id, s.dias])),
    feedbacks: feedbacks.rows,
  };
}

async function writeDB(db) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const p of db.progresso) {
      await client.query('UPDATE progresso SET status = $1, tentativas = $2, concluida_em = $3 WHERE usuario_id = $4 AND missao_id = $5', [p.status, p.tentativas, p.concluida_em, p.usuario_id, p.missao_id]);
    }
    for (const uc of db.usuario_conquistas) {
      await client.query('INSERT INTO usuario_conquistas (usuario_id, conquista_id, obtida_em) VALUES ($1, $2, $3) ON CONFLICT (usuario_id, conquista_id) DO NOTHING', [uc.usuario_id, uc.conquista_id, uc.obtida_em]);
    }
    for (const feedback of (db.feedbacks || [])) {
      await client.query('INSERT INTO feedbacks (id, aluno_id, professor_id, mensagem, criado_em) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING', [feedback.id, feedback.aluno_id, feedback.professor_id, feedback.mensagem, feedback.criado_em]);
    }
    await client.query('COMMIT');
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally { client.release(); }
}

module.exports = { readDB, writeDB };
