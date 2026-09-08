const express = require('express');
const { readDB } = require('../db');
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

// GET /api/professor/recursos — recursos pedagógicos estáticos alinhados à BNCC
router.get('/recursos', (req, res) => {
  res.json([
    { titulo: 'Plano de aula — Sequência lógica', tag: '6º ano · 2 aulas', formato: 'PDF' },
    { titulo: 'Roteiro — Estruturas condicionais', tag: '7º ano · 3 aulas', formato: 'PDF' },
    { titulo: 'Projeto — App para a comunidade', tag: '9º ano · 6 aulas', formato: 'PDF' },
    { titulo: 'Rubrica de avaliação por projeto', tag: 'todas as séries', formato: 'XLSX' },
  ]);
});

module.exports = router;
