const usuarioLogado = Sessao.exigirPapel('gestor');

if (usuarioLogado) {
  document.getElementById('whoAmI').textContent = usuarioLogado.nome;
  document.getElementById('btnSair').addEventListener('click', Sessao.sair);
  carregarKpis();
  carregarEscolas();
  carregarSeries();
}

async function carregarKpis() {
  try {
    const k = await api('/gestao/kpis');
    document.getElementById('kpiRow').innerHTML = `
      <div class="kpi"><div class="num">${k.estudantes_ativos}</div><div class="lbl">estudantes ativos</div></div>
      <div class="kpi"><div class="num">${k.escolas_participantes}</div><div class="lbl">escolas participantes</div><div class="delta">de ${k.escolas_na_rede} na rede</div></div>
      <div class="kpi"><div class="num">${k.taxa_media_conclusao}%</div><div class="lbl">taxa média de conclusão</div></div>
      <div class="kpi"><div class="num">${k.missoes_concluidas}</div><div class="lbl">missões concluídas</div></div>
    `;
  } catch (err) {
    document.getElementById('kpiRow').innerHTML = `<div class="loading">${err.message}</div>`;
  }
}

async function carregarEscolas() {
  try {
    const escolas = await api('/gestao/escolas');
    const max = Math.max(...escolas.map((e) => e.participacao_pct), 1);
    document.getElementById('barsEscolas').innerHTML = escolas.map((e) => `
      <div class="bar-col">
        <div class="bar-val">${e.participacao_pct}%</div>
        <div class="bar" style="height:${Math.max((e.participacao_pct / max) * 100, 4)}%"></div>
        <div class="bar-lbl">${e.escola.replace('E.M. ', '')}</div>
      </div>
    `).join('');
  } catch (err) {
    document.getElementById('barsEscolas').innerHTML = `<div class="loading">${err.message}</div>`;
  }
}

async function carregarSeries() {
  try {
    const series = await api('/gestao/series');
    document.getElementById('seriesBody').innerHTML = series.map((s) => `
      <tr><td>${s.serie}</td><td>${s.estudantes}</td><td>${s.conclusao_pct}%</td></tr>
    `).join('');
  } catch (err) {
    document.getElementById('seriesBody').innerHTML = `<tr><td colspan="3" class="loading">${err.message}</td></tr>`;
  }
}
