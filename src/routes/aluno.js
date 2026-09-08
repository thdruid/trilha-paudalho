const express = require('express');
const { readDB, writeDB } = require('../db');
const { exigirAuth } = require('../auth');

const router = express.Router();
router.use(exigirAuth(['aluno']));

function calcularXp(db, usuarioId) {
  const concluidas = db.progresso.filter((p) => p.usuario_id === usuarioId && p.status === 'concluida');
  const xp = concluidas.reduce((soma, p) => {
    const missao = db.missoes.find((m) => m.id === p.missao_id);
    return soma + (missao ? missao.xp : 0);
  }, 0);
  const nivel = Math.floor(xp / 100) + 1;
  const xpNoNivel = xp % 100;
  return { xp, nivel, xpNoNivel };
}

// GET /api/aluno/me — perfil + turma + escola + xp/nível/streak
router.get('/me', async (req, res) => {
  const db = await readDB();
  const usuario = db.usuarios.find((u) => u.id === req.usuario.id);
  const turma = db.turmas.find((t) => t.id === usuario.turma_id);
  const escola = turma ? db.escolas.find((e) => e.id === turma.escola_id) : null;
  const { xp, nivel, xpNoNivel } = calcularXp(db, usuario.id);

  res.json({
    id: usuario.id,
    nome: usuario.nome,
    turma: turma ? turma.nome : null,
    escola: escola ? escola.nome : null,
    xp,
    nivel,
    xpNoNivel,
    streak: db.streak[usuario.id] || 0,
  });
});

// GET /api/aluno/trilha — lista de missões com status para o aluno logado
router.get('/trilha', async (req, res) => {
  const db = await readDB();
  const missoesComStatus = db.missoes
    .slice()
    .sort((a, b) => a.ordem - b.ordem)
    .map((m) => {
      const p = db.progresso.find((x) => x.usuario_id === req.usuario.id && x.missao_id === m.id);
      return {
        id: m.id,
        ordem: m.ordem,
        titulo: m.titulo,
        xp: m.xp,
        status: p ? p.status : 'bloqueada',
      };
    });
  res.json(missoesComStatus);
});

// GET /api/aluno/missao/:id — detalhe do desafio (blocos embaralhados)
router.get('/missao/:id', async (req, res) => {
  const db = await readDB();
  const missao = db.missoes.find((m) => m.id === Number(req.params.id));
  if (!missao) return res.status(404).json({ erro: 'Missão não encontrada.' });

  const p = db.progresso.find((x) => x.usuario_id === req.usuario.id && x.missao_id === missao.id);
  if (!p || p.status === 'bloqueada') {
    return res.status(403).json({ erro: 'Esta missão ainda está bloqueada.' });
  }

  res.json({
    id: missao.id,
    titulo: missao.titulo,
    enunciado: missao.enunciado,
    blocos: missao.blocos,
    total_blocos: missao.blocos.length,
    status: p.status,
    xp: missao.xp,
  });
});

// POST /api/aluno/missao/:id/tentativa  { ordem: [0,2,1,...] }
// Valida a ordem enviada pelo aluno contra o gabarito da missão.
router.post('/missao/:id/tentativa', async (req, res) => {
  const db = await readDB();
  const missaoId = Number(req.params.id);
  const missao = db.missoes.find((m) => m.id === missaoId);
  if (!missao) return res.status(404).json({ erro: 'Missão não encontrada.' });

  const ordemEnviada = req.body.ordem;
  if (!Array.isArray(ordemEnviada) || ordemEnviada.length !== missao.ordem_correta.length) {
    return res.status(400).json({ erro: 'Ordem inválida.' });
  }

  const p = db.progresso.find((x) => x.usuario_id === req.usuario.id && x.missao_id === missaoId);
  if (!p || p.status === 'bloqueada') {
    return res.status(403).json({ erro: 'Esta missão ainda está bloqueada.' });
  }

  p.tentativas += 1;

  const correto = JSON.stringify(ordemEnviada) === JSON.stringify(missao.ordem_correta);
  let xpGanho = 0;
  let novasConquistas = [];

  if (correto && p.status !== 'concluida') {
    p.status = 'concluida';
    p.concluida_em = new Date().toISOString();
    xpGanho = missao.xp;

    // desbloqueia a próxima missão da trilha
    const proxima = db.missoes.find((m) => m.trilha_id === missao.trilha_id && m.ordem === missao.ordem + 1);
    if (proxima) {
      const pProxima = db.progresso.find((x) => x.usuario_id === req.usuario.id && x.missao_id === proxima.id);
      if (pProxima && pProxima.status === 'bloqueada') pProxima.status = 'disponivel';
    }

    // avalia conquistas simples baseadas em critério textual
    const jaTem = (conquistaId) => db.usuario_conquistas.some((uc) => uc.usuario_id === req.usuario.id && uc.conquista_id === conquistaId);
    db.conquistas.forEach((c) => {
      if (jaTem(c.id)) return;
      if (c.criterio === `missao_${missao.id}_concluida`) {
        db.usuario_conquistas.push({ usuario_id: req.usuario.id, conquista_id: c.id, obtida_em: new Date().toISOString() });
        novasConquistas.push(c);
      }
    });

    // conquista de trilha completa
    const todasDaTrilha = db.missoes.filter((m) => m.trilha_id === missao.trilha_id);
    const concluidasDoAluno = db.progresso.filter(
      (x) => x.usuario_id === req.usuario.id && x.status === 'concluida' && todasDaTrilha.some((m) => m.id === x.missao_id)
    );
    if (concluidasDoAluno.length === todasDaTrilha.length) {
      const trofeu = db.conquistas.find((c) => c.criterio === `trilha_${missao.trilha_id}_completa`);
      if (trofeu && !jaTem(trofeu.id)) {
        db.usuario_conquistas.push({ usuario_id: req.usuario.id, conquista_id: trofeu.id, obtida_em: new Date().toISOString() });
        novasConquistas.push(trofeu);
      }
    }
  }

  await writeDB(db);

  res.json({
    correto,
    xp_ganho: xpGanho,
    status: p.status,
    tentativas: p.tentativas,
    novas_conquistas: novasConquistas,
  });
});

// GET /api/aluno/conquistas
router.get('/conquistas', async (req, res) => {
  const db = await readDB();
  const obtidas = db.usuario_conquistas
    .filter((uc) => uc.usuario_id === req.usuario.id)
    .map((uc) => uc.conquista_id);

  const lista = db.conquistas.map((c) => ({
    ...c,
    obtida: obtidas.includes(c.id),
  }));
  res.json(lista);
});

module.exports = router;
