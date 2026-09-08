const usuarioLogado = Sessao.exigirPapel('gestor');
let escolasDoRelatorio = [];
let seriesDoRelatorio = [];

if (usuarioLogado) {
  document.getElementById('whoAmI').textContent = usuarioLogado.nome;
  document.getElementById('btnSair').addEventListener('click', Sessao.sair);
  carregarKpis();
  carregarEscolas();
  carregarSeries();
  document.getElementById('downloadReport').addEventListener('click', baixarRelatorio);
}

function numero(valor, limite = Infinity) {
  return Math.max(0, Math.min(limite, Number(valor) || 0));
}

function erro(elemento, mensagem, colspan = null) {
  elemento.replaceChildren();
  const linha = colspan ? document.createElement('tr') : document.createElement('div');
  const destino = colspan ? document.createElement('td') : linha;
  destino.className = 'loading';
  destino.textContent = mensagem;
  if (colspan) {
    destino.colSpan = colspan;
    linha.appendChild(destino);
  }
  elemento.appendChild(linha);
}

function criarDiv(classe, texto) {
  const div = document.createElement('div');
  div.className = classe;
  div.textContent = texto;
  return div;
}

async function carregarKpis() {
  const linha = document.getElementById('kpiRow');
  try {
    const k = await api('/gestao/kpis');
    const itens = [
      [numero(k.estudantes_ativos), 'estudantes ativos'],
      [numero(k.escolas_participantes), 'escolas participantes', `de ${numero(k.escolas_na_rede)} na rede`],
      [`${numero(k.taxa_media_conclusao, 100)}%`, 'taxa média de conclusão'],
      [numero(k.missoes_concluidas), 'missões concluídas'],
    ];
    linha.replaceChildren(...itens.map(([valor, rotulo, detalhe]) => {
      const card = criarDiv('kpi', '');
      card.append(criarDiv('num', valor), criarDiv('lbl', rotulo));
      if (detalhe) card.appendChild(criarDiv('delta', detalhe));
      return card;
    }));
  } catch (err) {
    erro(linha, err.message);
  }
}

async function carregarEscolas() {
  const area = document.getElementById('barsEscolas');
  try {
    const escolas = await api('/gestao/escolas');
    escolasDoRelatorio = escolas;
    const max = Math.max(...escolas.map((e) => numero(e.participacao_pct, 100)), 1);
    area.replaceChildren(...escolas.map((escola) => {
      const percentual = numero(escola.participacao_pct, 100);
      const coluna = criarDiv('bar-col', '');
      const barra = criarDiv('bar', '');
      barra.style.height = `${Math.max((percentual / max) * 100, 4)}%`;
      coluna.append(criarDiv('bar-val', `${percentual}%`), barra, criarDiv('bar-lbl', String(escola.escola || '').replace('E.M. ', '')));
      return coluna;
    }));
  } catch (err) {
    erro(area, err.message);
  }
}

async function carregarSeries() {
  const corpo = document.getElementById('seriesBody');
  try {
    const series = await api('/gestao/series');
    seriesDoRelatorio = series;
    corpo.replaceChildren(...series.map((serie) => {
      const linha = document.createElement('tr');
      [serie.serie, numero(serie.estudantes), `${numero(serie.conclusao_pct, 100)}%`].forEach((valor) => {
        const celula = document.createElement('td');
        celula.textContent = valor;
        linha.appendChild(celula);
      });
      return linha;
    }));
  } catch (err) {
    erro(corpo, err.message, 3);
  }
}

function csvSeguro(valor) {
  return `"${String(valor ?? '').replace(/"/g, '""')}"`;
}

function baixarRelatorio() {
  if (!escolasDoRelatorio.length && !seriesDoRelatorio.length) return;
  const linhas = [
    ['Relatório Trilha Paudalho', new Date().toLocaleDateString('pt-BR')],
    [],
    ['Participação por escola'],
    ['Escola', 'Estudantes', 'Conclusão média (%)'],
    ...escolasDoRelatorio.map((e) => [e.escola, e.estudantes, e.participacao_pct]),
    [],
    ['Indicadores por série'],
    ['Série', 'Estudantes', 'Conclusão média (%)'],
    ...seriesDoRelatorio.map((s) => [s.serie, s.estudantes, s.conclusao_pct]),
  ];
  const conteudo = `\uFEFF${linhas.map((linha) => linha.map(csvSeguro).join(';')).join('\n')}`;
  const arquivo = new Blob([conteudo], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'relatorio-trilha-paudalho.csv';
  link.click();
  URL.revokeObjectURL(url);
}
