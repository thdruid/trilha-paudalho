require('dotenv').config();
process.env.DB_DRIVER = 'json';
const { readDB } = require('./db');
const { pool } = require('./postgres');

async function inserir(client, tabela, colunas, valores) {
  const marcadores = colunas.map((_, indice) => `$${indice + 1}`).join(', ');
  await client.query(`INSERT INTO ${tabela} (${colunas.join(', ')}) VALUES (${marcadores})`, valores);
}

async function popular() {
  const db = readDB();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existente = await client.query('SELECT COUNT(*)::int AS total FROM usuarios');
    if (existente.rows[0].total > 0) throw new Error('O banco já possui usuários; carga de demonstração cancelada.');

    for (const escola of db.escolas) await inserir(client, 'escolas', ['id', 'nome'], [escola.id, escola.nome]);
    for (const turma of db.turmas) await inserir(client, 'turmas', ['id', 'escola_id', 'nome', 'serie'], [turma.id, turma.escola_id, turma.nome, turma.serie]);
    for (const usuario of db.usuarios) await inserir(client, 'usuarios', ['id', 'nome', 'email', 'senha_hash', 'papel', 'turma_id', 'turmas_ids'], [usuario.id, usuario.nome, usuario.email, usuario.senha_hash, usuario.papel, usuario.turma_id || null, JSON.stringify(usuario.turmas_ids || [])]);
    for (const trilha of db.trilhas) await inserir(client, 'trilhas', ['id', 'titulo', 'ordem'], [trilha.id, trilha.titulo, trilha.ordem]);
    for (const missao of db.missoes) await inserir(client, 'missoes', ['id', 'trilha_id', 'ordem', 'titulo', 'enunciado', 'blocos', 'ordem_correta', 'xp'], [missao.id, missao.trilha_id, missao.ordem, missao.titulo, missao.enunciado, JSON.stringify(missao.blocos), JSON.stringify(missao.ordem_correta), missao.xp]);
    for (const progresso of db.progresso) await inserir(client, 'progresso', ['usuario_id', 'missao_id', 'status', 'tentativas', 'concluida_em'], [progresso.usuario_id, progresso.missao_id, progresso.status, progresso.tentativas, progresso.concluida_em]);
    for (const conquista of db.conquistas) await inserir(client, 'conquistas', ['id', 'titulo', 'icone', 'criterio'], [conquista.id, conquista.titulo, conquista.icone, conquista.criterio]);
    for (const conquista of db.usuario_conquistas) await inserir(client, 'usuario_conquistas', ['usuario_id', 'conquista_id', 'obtida_em'], [conquista.usuario_id, conquista.conquista_id, conquista.obtida_em]);
    for (const [usuarioId, acesso] of Object.entries(db.ultimo_acesso)) await inserir(client, 'ultimo_acesso', ['usuario_id', 'acessado_em'], [usuarioId, acesso]);
    for (const [usuarioId, dias] of Object.entries(db.streak)) await inserir(client, 'streak', ['usuario_id', 'dias'], [usuarioId, dias]);
    await client.query('COMMIT');
    console.log('Dados de demonstração inseridos no PostgreSQL.');
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }
}

popular().catch((erro) => {
  console.error('Falha ao popular PostgreSQL:', erro.message);
  process.exitCode = 1;
}).finally(() => pool.end());
