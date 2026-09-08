const express = require('express');
const { readDB } = require('../db');
const { exigirAuth } = require('../auth');

const router = express.Router();
router.use(exigirAuth(['gestor']));

// GET /api/gestao/kpis — indicadores agregados calculados a partir dos dados reais da base
router.get('/kpis', async (req, res) => {
  const db = await readDB();
  const alunos = db.usuarios.filter((u) => u.papel === 'aluno');
  const totalMissoes = db.missoes.length;

  const taxasConclusaoPorAluno = alunos.map((a) => {
    const concluidas = db.progresso.filter((p) => p.usuario_id === a.id && p.status === 'concluida').length;
    return concluidas / totalMissoes;
  });
  const taxaMedia = taxasConclusaoPorAluno.length
    ? Math.round((taxasConclusaoPorAluno.reduce((s, v) => s + v, 0) / taxasConclusaoPorAluno.length) * 100)
    : 0;

  const missoesConcluidas = db.progresso.filter((p) => p.status === 'concluida').length;
  const escolasComTurma = new Set(db.turmas.map((t) => t.escola_id));

  res.json({
    estudantes_ativos: alunos.length,
    escolas_participantes: escolasComTurma.size,
    escolas_na_rede: db.escolas.length,
    taxa_media_conclusao: taxaMedia,
    missoes_concluidas: missoesConcluidas,
  });
});

// GET /api/gestao/escolas — participação (% médio de conclusão) por escola
router.get('/escolas', async (req, res) => {
  const db = await readDB();
  const totalMissoes = db.missoes.length;

  const dados = db.escolas.map((escola) => {
    const turmasDaEscola = db.turmas.filter((t) => t.escola_id === escola.id).map((t) => t.id);
    const alunosDaEscola = db.usuarios.filter((u) => u.papel === 'aluno' && turmasDaEscola.includes(u.turma_id));

    const taxas = alunosDaEscola.map((a) => {
      const concluidas = db.progresso.filter((p) => p.usuario_id === a.id && p.status === 'concluida').length;
      return concluidas / totalMissoes;
    });
    const media = taxas.length ? Math.round((taxas.reduce((s, v) => s + v, 0) / taxas.length) * 100) : 0;

    return { escola: escola.nome, participacao_pct: media, estudantes: alunosDaEscola.length };
  });

  res.json(dados);
});

// GET /api/gestao/series — indicadores agregados por série (6º ao 9º ano)
router.get('/series', async (req, res) => {
  const db = await readDB();
  const totalMissoes = db.missoes.length;
  const series = [6, 7, 8, 9];

  const dados = series.map((serie) => {
    const turmasDaSerie = db.turmas.filter((t) => t.serie === serie).map((t) => t.id);
    const alunosDaSerie = db.usuarios.filter((u) => u.papel === 'aluno' && turmasDaSerie.includes(u.turma_id));
    const taxas = alunosDaSerie.map((a) => {
      const concluidas = db.progresso.filter((p) => p.usuario_id === a.id && p.status === 'concluida').length;
      return concluidas / totalMissoes;
    });
    const media = taxas.length ? Math.round((taxas.reduce((s, v) => s + v, 0) / taxas.length) * 100) : 0;

    return { serie: `${serie}º ano`, estudantes: alunosDaSerie.length, conclusao_pct: media };
  });

  res.json(dados);
});

module.exports = router;
