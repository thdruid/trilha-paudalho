require('dotenv').config();
const { pool } = require('./postgres');

const schema = `
CREATE TABLE IF NOT EXISTS escolas (id INTEGER PRIMARY KEY, nome TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS turmas (id INTEGER PRIMARY KEY, escola_id INTEGER NOT NULL REFERENCES escolas(id), nome TEXT NOT NULL, serie INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, email TEXT NOT NULL UNIQUE, senha_hash TEXT NOT NULL, papel TEXT NOT NULL CHECK (papel IN ('aluno', 'professor', 'gestor')), turma_id INTEGER REFERENCES turmas(id), turmas_ids JSONB NOT NULL DEFAULT '[]'::jsonb);
CREATE TABLE IF NOT EXISTS trilhas (id INTEGER PRIMARY KEY, titulo TEXT NOT NULL, ordem INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS missoes (id INTEGER PRIMARY KEY, trilha_id INTEGER NOT NULL REFERENCES trilhas(id), ordem INTEGER NOT NULL, titulo TEXT NOT NULL, enunciado TEXT NOT NULL, blocos JSONB NOT NULL, ordem_correta JSONB NOT NULL, xp INTEGER NOT NULL, UNIQUE (trilha_id, ordem));
CREATE TABLE IF NOT EXISTS progresso (usuario_id INTEGER NOT NULL REFERENCES usuarios(id), missao_id INTEGER NOT NULL REFERENCES missoes(id), status TEXT NOT NULL CHECK (status IN ('bloqueada', 'disponivel', 'concluida')), tentativas INTEGER NOT NULL DEFAULT 0, concluida_em TIMESTAMPTZ, PRIMARY KEY (usuario_id, missao_id));
CREATE TABLE IF NOT EXISTS conquistas (id INTEGER PRIMARY KEY, titulo TEXT NOT NULL, icone TEXT NOT NULL, criterio TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS usuario_conquistas (usuario_id INTEGER NOT NULL REFERENCES usuarios(id), conquista_id INTEGER NOT NULL REFERENCES conquistas(id), obtida_em TIMESTAMPTZ NOT NULL, PRIMARY KEY (usuario_id, conquista_id));
CREATE TABLE IF NOT EXISTS ultimo_acesso (usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id), acessado_em TIMESTAMPTZ NOT NULL);
CREATE TABLE IF NOT EXISTS streak (usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id), dias INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS idx_usuarios_turma ON usuarios(turma_id);
CREATE INDEX IF NOT EXISTS idx_progresso_usuario ON progresso(usuario_id);
ALTER TABLE escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE trilhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE missoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE progresso ENABLE ROW LEVEL SECURITY;
ALTER TABLE conquistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_conquistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ultimo_acesso ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
`;

async function migrar() {
  await pool.query(schema);
  console.log('Esquema PostgreSQL criado ou atualizado.');
}

migrar().catch((erro) => {
  console.error('Falha na migração:', erro.message);
  process.exitCode = 1;
}).finally(() => pool.end());
