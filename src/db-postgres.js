const { pool } = require('./postgres');

async function readDB() {
  const [escolas, turmas, usuarios, trilhas, missoes, progresso, conquistas, usuarioConquistas, acessos, streaks, feedbacks, projetos, ralis, raliInscricoes] = await Promise.all([
    pool.query('SELECT * FROM escolas ORDER BY id'), pool.query('SELECT * FROM turmas ORDER BY id'), pool.query('SELECT * FROM usuarios ORDER BY id'),
    pool.query('SELECT * FROM trilhas ORDER BY id'), pool.query('SELECT * FROM missoes ORDER BY id'), pool.query('SELECT * FROM progresso'),
    pool.query('SELECT * FROM conquistas ORDER BY id'), pool.query('SELECT * FROM usuario_conquistas'), pool.query('SELECT * FROM ultimo_acesso'), pool.query('SELECT * FROM streak'),
    pool.query('SELECT * FROM feedbacks ORDER BY criado_em DESC'),
    pool.query('SELECT * FROM projetos ORDER BY atualizado_em DESC'),
    pool.query('SELECT * FROM ralis ORDER BY inicio DESC'), pool.query('SELECT * FROM rali_inscricoes'),
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
    projetos: projetos.rows,
    ralis: ralis.rows, rali_inscricoes: raliInscricoes.rows,
  };
}

async function writeDB(db) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const usuario of db.usuarios) {
      await client.query('INSERT INTO usuarios (id,nome,email,senha_hash,papel,turma_id,turmas_ids,avatar) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO UPDATE SET avatar=EXCLUDED.avatar', [usuario.id, usuario.nome, usuario.email, usuario.senha_hash, usuario.papel, usuario.turma_id || null, JSON.stringify(usuario.turmas_ids || []), usuario.avatar || '🧑‍💻']);
    }
    for (const p of db.progresso) {
      await client.query('INSERT INTO progresso (usuario_id,missao_id,status,tentativas,concluida_em) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (usuario_id,missao_id) DO UPDATE SET status=EXCLUDED.status,tentativas=EXCLUDED.tentativas,concluida_em=EXCLUDED.concluida_em', [p.usuario_id, p.missao_id, p.status, p.tentativas, p.concluida_em]);
    }
    for (const uc of db.usuario_conquistas) {
      await client.query('INSERT INTO usuario_conquistas (usuario_id, conquista_id, obtida_em) VALUES ($1, $2, $3) ON CONFLICT (usuario_id, conquista_id) DO NOTHING', [uc.usuario_id, uc.conquista_id, uc.obtida_em]);
    }
    for (const feedback of (db.feedbacks || [])) {
      await client.query('INSERT INTO feedbacks (id, aluno_id, professor_id, mensagem, criado_em) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING', [feedback.id, feedback.aluno_id, feedback.professor_id, feedback.mensagem, feedback.criado_em]);
    }
    for (const projeto of (db.projetos || [])) {
      await client.query('INSERT INTO projetos (id, aluno_id, titulo, problema, plano, status, criado_em, atualizado_em, professor_id, devolutiva) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO UPDATE SET titulo=EXCLUDED.titulo, problema=EXCLUDED.problema, plano=EXCLUDED.plano, status=EXCLUDED.status, atualizado_em=EXCLUDED.atualizado_em, professor_id=EXCLUDED.professor_id, devolutiva=EXCLUDED.devolutiva', [projeto.id, projeto.aluno_id, projeto.titulo, projeto.problema, projeto.plano, projeto.status, projeto.criado_em, projeto.atualizado_em, projeto.professor_id || null, projeto.devolutiva || null]);
    }
    for (const inscricao of (db.rali_inscricoes || [])) await client.query('INSERT INTO rali_inscricoes (rali_id, aluno_id, inscrito_em) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [inscricao.rali_id, inscricao.aluno_id, inscricao.inscrito_em]);
    await client.query('COMMIT');
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally { client.release(); }
}

module.exports = { readDB, writeDB };
