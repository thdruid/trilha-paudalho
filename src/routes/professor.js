const express = require('express');
const bcrypt = require('bcryptjs');
const { readDB, writeDB } = require('../db');
const { exigirAuth } = require('../auth');

const router = express.Router();
router.use(exigirAuth(['professor']));

function diasDesde(isoString) {
  if (!isoString) return null;
  const diffMs = Date.now() - new Date(isoString).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// GET /api/professor/turmas — turmas do professor logado
router.get('/turmas', async (req, res) => {
  const db = await readDB();
  const professor = db.usuarios.find((u) => u.id === req.usuario.id);
  const turmas = db.turmas
    .filter((t) => (professor.turmas_ids || []).includes(t.id))
    .map((t) => {
      const escola = db.escolas.find((e) => e.id === t.escola_id);
      return { id: t.id, nome: t.nome, escola: escola ? escola.nome : null };
    });
  res.json(turmas);
});

// GET /api/professor/turma/:id/estudantes — progresso de cada estudante da turma
router.get('/turma/:id/estudantes', async (req, res) => {
  const db = await readDB();
  const turmaId = Number(req.params.id);
  const professor = db.usuarios.find((u) => u.id === req.usuario.id);

  if (!Number.isInteger(turmaId) || !professor || !(professor.turmas_ids || []).includes(turmaId)) {
    return res.status(403).json({ erro: 'Sem permissÃ£o para acessar esta turma.' });
  }

  const totalMissoes = db.missoes.length;

  const estudantes = db.usuarios
    .filter((u) => u.papel === 'aluno' && u.turma_id === turmaId)
    .map((u) => {
      const progresso = db.progresso.filter((p) => p.usuario_id === u.id);
      const concluidas = progresso.filter((p) => p.status === 'concluida');
      const atual = progresso.find((p) => p.status === 'disponivel');
      const missaoAtual = atual ? db.missoes.find((m) => m.id === atual.missao_id) : null;
      const ultimoAcesso = db.ultimo_acesso[u.id] || null;

      return {
        id: u.id,
        nome: u.nome,
        trilha_atual: missaoAtual ? missaoAtual.titulo : (concluidas.length === totalMissoes ? 'Trilha concluída' : '—'),
        progresso_pct: Math.round((concluidas.length / totalMissoes) * 100),
        dias_sem_atividade: diasDesde(ultimoAcesso),
      };
    });

  res.json(estudantes);
});

router.post('/turma/:id/estudantes', async (req, res) => {
  const db = await readDB(); const turmaId = Number(req.params.id); const professor = db.usuarios.find((u) => u.id === req.usuario.id);
  if (!professor || !(professor.turmas_ids || []).includes(turmaId)) return res.status(403).json({ erro: 'Sem permissão para cadastrar nesta turma.' });
  const nome = String(req.body.nome || '').trim(); const email = String(req.body.email || '').trim().toLowerCase(); const senha = String(req.body.senha || '');
  if (!nome || !email.includes('@') || senha.length < 12) return res.status(400).json({ erro: 'Informe nome, e-mail e senha inicial de ao menos 12 caracteres.' });
  if (db.usuarios.some((u) => u.email.toLowerCase() === email)) return res.status(409).json({ erro: 'Este e-mail já está cadastrado.' });
  const id = Math.max(...db.usuarios.map((u) => u.id)) + 1; db.usuarios.push({ id, nome, email, senha_hash: bcrypt.hashSync(senha, 10), papel: 'aluno', turma_id: turmaId, avatar: '🧑‍💻' });
  db.progresso.push(...db.missoes.map((missao) => ({ usuario_id: id, missao_id: missao.id, status: missao.ordem === 1 ? 'disponivel' : 'bloqueada', tentativas: 0, concluida_em: null })));
  db.streak[id] = 0; db.ultimo_acesso[id] = new Date().toISOString(); await writeDB(db); res.status(201).json({ id, nome, email });
});

// POST /api/professor/turma/:turmaId/estudante/:alunoId/feedback
// O professor só pode enviar feedback para estudantes das próprias turmas.
router.post('/turma/:turmaId/estudante/:alunoId/feedback', async (req, res) => {
  const db = await readDB();
  const turmaId = Number(req.params.turmaId);
  const alunoId = Number(req.params.alunoId);
  const professor = db.usuarios.find((u) => u.id === req.usuario.id);
  const aluno = db.usuarios.find((u) => u.id === alunoId && u.papel === 'aluno');
  const mensagem = typeof req.body.mensagem === 'string' ? req.body.mensagem.trim() : '';

  if (!Number.isInteger(turmaId) || !professor || !(professor.turmas_ids || []).includes(turmaId)) {
    return res.status(403).json({ erro: 'Sem permissão para enviar feedback nesta turma.' });
  }
  if (!aluno || aluno.turma_id !== turmaId) {
    return res.status(404).json({ erro: 'Estudante não encontrado nesta turma.' });
  }
  if (!mensagem || mensagem.length > 800) {
    return res.status(400).json({ erro: 'O feedback deve ter entre 1 e 800 caracteres.' });
  }

  const feedbacks = db.feedbacks || [];
  const feedback = {
    id: feedbacks.length ? Math.max(...feedbacks.map((item) => item.id)) + 1 : 1,
    aluno_id: aluno.id,
    professor_id: professor.id,
    mensagem,
    criado_em: new Date().toISOString(),
  };
  feedbacks.push(feedback);
  db.feedbacks = feedbacks;
  await writeDB(db);
  res.status(201).json({ id: feedback.id, criado_em: feedback.criado_em });
});

router.get('/projetos', async (req, res) => {
  const db = await readDB();
  const professor = db.usuarios.find((u) => u.id === req.usuario.id);
  const projetos = (db.projetos || []).filter((projeto) => {
    const aluno = db.usuarios.find((u) => u.id === projeto.aluno_id);
    return aluno && (professor.turmas_ids || []).includes(aluno.turma_id) && projeto.status !== 'rascunho';
  }).map((projeto) => ({ ...projeto, aluno: db.usuarios.find((u) => u.id === projeto.aluno_id).nome }));
  res.json(projetos);
});

router.post('/projetos/:id/revisao', async (req, res) => {
  const db = await readDB(); const professor = db.usuarios.find((u) => u.id === req.usuario.id);
  const projeto = (db.projetos || []).find((item) => item.id === Number(req.params.id));
  const aluno = projeto && db.usuarios.find((u) => u.id === projeto.aluno_id);
  const devolutiva = typeof req.body.devolutiva === 'string' ? req.body.devolutiva.trim() : '';
  if (!projeto || !aluno || !(professor.turmas_ids || []).includes(aluno.turma_id)) return res.status(403).json({ erro: 'Sem permissão para revisar este projeto.' });
  if (!devolutiva || devolutiva.length > 800) return res.status(400).json({ erro: 'A revisão deve ter entre 1 e 800 caracteres.' });
  projeto.status = 'revisado'; projeto.professor_id = professor.id; projeto.devolutiva = devolutiva; projeto.atualizado_em = new Date().toISOString();
  await writeDB(db); res.json(projeto);
});

// GET /api/professor/recursos — recursos pedagógicos estáticos alinhados à BNCC
router.get('/recursos', (req, res) => {
  res.json([
    { titulo: 'Plano de aula — Sequência lógica', tag: '6º ano · 2 aulas', formato: 'Abrir guia', url: '/recursos/sequencia.html' },
    { titulo: 'Roteiro — Estruturas condicionais', tag: '7º ano · 3 aulas', formato: 'Abrir guia', url: '/recursos/condicionais.html' },
    { titulo: 'Projeto — App para a comunidade', tag: '9º ano · 6 aulas', formato: 'Abrir guia', url: '/recursos/projeto.html' },
    { titulo: 'Rubrica de avaliação por projeto', tag: 'todas as séries', formato: 'Abrir guia', url: '/recursos/rubrica.html' },
  ]);
});

module.exports = router;
