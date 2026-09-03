const usuarioLogado = Sessao.exigirPapel('aluno');

if (usuarioLogado) {
  document.getElementById('whoAmI').textContent = usuarioLogado.nome;
  document.getElementById('btnSair').addEventListener('click', Sessao.sair);
  carregarPerfil();
  carregarTrilha();
  carregarConquistas();
}

async function carregarPerfil() {
  try {
    const p = await api('/aluno/me');
    const el = document.getElementById('profileRow');
    const iniciais = p.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
    const xpNoNivelPct = p.xpNoNivel; // já é 0-99 (xp % 100)
    el.innerHTML = `
      <div class="avatar">${iniciais}</div>
      <div class="profile-info">
        <div class="name">${p.nome} — ${p.turma || ''}</div>
        <div class="school">${p.escola || ''}</div>
      </div>
      <div class="xp-wrap">
        <div class="xp-label"><span>Nível ${p.nivel}</span><span>${p.xp} XP total</span></div>
        <div class="xp-bar"><div class="xp-fill" style="width:${xpNoNivelPct}%"></div></div>
      </div>
      <div class="streak">🔥 ${p.streak} dias seguidos</div>
    `;
  } catch (err) {
    document.getElementById('profileRow').innerHTML = `<div class="loading">${err.message}</div>`;
  }
}

// posições fixas dos 7 nós na trilha (mesma curva do SVG de fundo)
const posicoes = [
  { x: 40, y: 160 },
  { x: 260, y: 150 },
  { x: 460, y: 150 },
  { x: 660, y: 150 },
  { x: 860, y: 150 },
  { x: 950, y: 70 },
  { x: 980, y: 70 }, // caso existam mais de 6 missões, cai aqui (ajustado dinamicamente abaixo)
];

let missoesAtuais = [];

async function carregarTrilha() {
  try {
    missoesAtuais = await api('/aluno/trilha');
    const svg = document.getElementById('trailSvg');
    // remove nós antigos, mantém o path de fundo
    svg.querySelectorAll('g.node').forEach((n) => n.remove());

    missoesAtuais.forEach((m, i) => {
      const pos = posicoes[i] || { x: 980, y: 70 };
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'node ' + statusParaClasse(m.status));
      g.setAttribute('transform', `translate(${pos.x},${pos.y})`);
      const cor = m.status === 'concluida' ? '#12867a' : m.status === 'disponivel' ? '#e85d3f' : '#c7cbc3';
      const numero = m.status === 'concluida' ? '✓' : (i + 1);
      g.innerHTML = `
        <circle class="ring" r="22" stroke="${cor}"/>
        <text class="num" x="0" y="5" text-anchor="middle">${numero}</text>
        <text class="label" x="0" y="42" text-anchor="middle">${m.titulo}</text>
      `;
      if (m.status !== 'bloqueada') {
        g.addEventListener('click', () => abrirMissao(m.id));
      }
      svg.appendChild(g);
    });
  } catch (err) {
    console.error(err);
  }
}

function statusParaClasse(status) {
  if (status === 'concluida') return 'done';
  if (status === 'disponivel') return 'current';
  return 'locked';
}

async function carregarConquistas() {
  try {
    const conquistas = await api('/aluno/conquistas');
    const grid = document.getElementById('badgeGrid');
    grid.innerHTML = '';
    conquistas.forEach((c) => {
      const el = document.createElement('div');
      el.className = 'badge' + (c.obtida ? '' : ' locked');
      el.innerHTML = `<div class="badge-icon">${c.icone}</div><div class="badge-title">${c.titulo}</div>`;
      grid.appendChild(el);
    });
    const obtidas = conquistas.filter((c) => c.obtida).length;
    document.getElementById('badgeCount').textContent = `${obtidas} de ${conquistas.length} desbloqueadas`;
  } catch (err) {
    console.error(err);
  }
}

// ---------------------------------------------------------------------------
// Modal de desafio
// ---------------------------------------------------------------------------
let missaoAtual = null;
let blocosEmbaralhados = []; // [{texto, indiceOriginal}]
let picked = []; // índices originais escolhidos, na ordem clicada

async function abrirMissao(id) {
  try {
    missaoAtual = await api(`/aluno/missao/${id}`);
    picked = [];
    blocosEmbaralhados = missaoAtual.blocos.map((texto, idx) => ({ texto, idx })).sort(() => Math.random() - 0.5);

    document.getElementById('modalTitle').textContent = `Missão: ${missaoAtual.titulo}`;
    document.getElementById('modalDesc').textContent = missaoAtual.enunciado;
    document.getElementById('modalFeedback').textContent = '';
    document.getElementById('modalFeedback').className = 'feedback';
    renderBlocos();
    document.getElementById('overlay').classList.add('active');
  } catch (err) {
    alert(err.message);
  }
}

function renderBlocos() {
  const wrap = document.getElementById('modalBlocks');
  wrap.innerHTML = '';
  blocosEmbaralhados.forEach(({ texto, idx }) => {
    const jaEscolhido = picked.includes(idx);
    const ordemNum = picked.indexOf(idx);
    const b = document.createElement('button');
    b.className = 'block-btn' + (jaEscolhido ? ' picked disabled' : '');
    b.textContent = (ordemNum > -1 ? (ordemNum + 1) + '. ' : '') + texto;
    b.addEventListener('click', () => {
      if (picked.includes(idx)) return;
      picked.push(idx);
      renderBlocos();
      if (picked.length === blocosEmbaralhados.length) enviarTentativa();
    });
    wrap.appendChild(b);
  });
}

async function enviarTentativa() {
  const fb = document.getElementById('modalFeedback');
  try {
    const resultado = await api(`/aluno/missao/${missaoAtual.id}/tentativa`, {
      method: 'POST',
      body: JSON.stringify({ ordem: picked }),
    });
    if (resultado.correto) {
      let msg = `✓ Correto! +${resultado.xp_ganho} XP`;
      if (resultado.novas_conquistas.length) {
        msg += ` · nova conquista: ${resultado.novas_conquistas.map(c => c.titulo).join(', ')}`;
      }
      fb.textContent = msg;
      fb.className = 'feedback ok';
      carregarPerfil();
      carregarTrilha();
      carregarConquistas();
    } else {
      fb.textContent = '✗ Ordem incorreta — tente de novo';
      fb.className = 'feedback err';
    }
  } catch (err) {
    fb.textContent = err.message;
    fb.className = 'feedback err';
  }
}

document.getElementById('resetModal').addEventListener('click', () => {
  picked = [];
  renderBlocos();
  document.getElementById('modalFeedback').textContent = '';
});
document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('overlay').classList.remove('active');
});
document.getElementById('overlay').addEventListener('click', (e) => {
  if (e.target.id === 'overlay') document.getElementById('overlay').classList.remove('active');
});
