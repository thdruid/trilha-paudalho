require('dotenv').config();
const { pool } = require('./postgres');

const schema = `
CREATE TABLE IF NOT EXISTS escolas (id INTEGER PRIMARY KEY, nome TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS turmas (id INTEGER PRIMARY KEY, escola_id INTEGER NOT NULL REFERENCES escolas(id), nome TEXT NOT NULL, serie INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, email TEXT NOT NULL UNIQUE, senha_hash TEXT NOT NULL, papel TEXT NOT NULL CHECK (papel IN ('aluno', 'professor', 'gestor')), turma_id INTEGER REFERENCES turmas(id), turmas_ids JSONB NOT NULL DEFAULT '[]'::jsonb);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS avatar TEXT NOT NULL DEFAULT '🧑‍💻';
CREATE TABLE IF NOT EXISTS trilhas (id INTEGER PRIMARY KEY, titulo TEXT NOT NULL, ordem INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS missoes (id INTEGER PRIMARY KEY, trilha_id INTEGER NOT NULL REFERENCES trilhas(id), ordem INTEGER NOT NULL, titulo TEXT NOT NULL, enunciado TEXT NOT NULL, blocos JSONB NOT NULL, ordem_correta JSONB NOT NULL, xp INTEGER NOT NULL, UNIQUE (trilha_id, ordem));
CREATE TABLE IF NOT EXISTS progresso (usuario_id INTEGER NOT NULL REFERENCES usuarios(id), missao_id INTEGER NOT NULL REFERENCES missoes(id), status TEXT NOT NULL CHECK (status IN ('bloqueada', 'disponivel', 'concluida')), tentativas INTEGER NOT NULL DEFAULT 0, concluida_em TIMESTAMPTZ, PRIMARY KEY (usuario_id, missao_id));
CREATE TABLE IF NOT EXISTS conquistas (id INTEGER PRIMARY KEY, titulo TEXT NOT NULL, icone TEXT NOT NULL, criterio TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS usuario_conquistas (usuario_id INTEGER NOT NULL REFERENCES usuarios(id), conquista_id INTEGER NOT NULL REFERENCES conquistas(id), obtida_em TIMESTAMPTZ NOT NULL, PRIMARY KEY (usuario_id, conquista_id));
CREATE TABLE IF NOT EXISTS ultimo_acesso (usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id), acessado_em TIMESTAMPTZ NOT NULL);
CREATE TABLE IF NOT EXISTS streak (usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id), dias INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS feedbacks (id BIGSERIAL PRIMARY KEY, aluno_id INTEGER NOT NULL REFERENCES usuarios(id), professor_id INTEGER NOT NULL REFERENCES usuarios(id), mensagem TEXT NOT NULL CHECK (char_length(mensagem) BETWEEN 1 AND 800), criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS projetos (id BIGSERIAL PRIMARY KEY, aluno_id INTEGER NOT NULL REFERENCES usuarios(id), titulo TEXT NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 70), problema TEXT NOT NULL CHECK (char_length(problema) BETWEEN 1 AND 500), plano TEXT NOT NULL CHECK (char_length(plano) BETWEEN 1 AND 500), status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviado', 'revisado')), criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), professor_id INTEGER REFERENCES usuarios(id), devolutiva TEXT);
CREATE TABLE IF NOT EXISTS ralis (id INTEGER PRIMARY KEY, titulo TEXT NOT NULL, descricao TEXT NOT NULL, tipo TEXT NOT NULL CHECK (tipo IN ('rali', 'hackathon')), inicio DATE NOT NULL, fim DATE NOT NULL);
CREATE TABLE IF NOT EXISTS rali_inscricoes (rali_id INTEGER NOT NULL REFERENCES ralis(id), aluno_id INTEGER NOT NULL REFERENCES usuarios(id), inscrito_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (rali_id, aluno_id));
CREATE TABLE IF NOT EXISTS recuperacoes_senha (token_hash TEXT PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuarios(id), expira_em TIMESTAMPTZ NOT NULL, usado_em TIMESTAMPTZ);
INSERT INTO ralis (id, titulo, descricao, tipo, inicio, fim) VALUES (1, 'Rali de Programação: Soluções para o bairro', 'Crie um algoritmo ou projeto que ajude a resolver um problema da escola ou comunidade.', 'rali', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days') ON CONFLICT (id) DO NOTHING;
CREATE INDEX IF NOT EXISTS idx_usuarios_turma ON usuarios(turma_id);
CREATE INDEX IF NOT EXISTS idx_progresso_usuario ON progresso(usuario_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_aluno ON feedbacks(aluno_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_projetos_aluno ON projetos(aluno_id, atualizado_em DESC);
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
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ralis ENABLE ROW LEVEL SECURITY;
ALTER TABLE rali_inscricoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recuperacoes_senha ENABLE ROW LEVEL SECURITY;
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
