const usuarioLogado = Sessao.exigirPapel('aluno');

if (usuarioLogado) {
  document.getElementById('whoAmI').textContent = usuarioLogado.nome;
  document.getElementById('btnSair').addEventListener('click', Sessao.sair);
  carregarPerfil();
  carregarTrilha();
  carregarConquistas();
  configurarNavegacaoEstudante();
  configurarProjetos();
  configurarAvatares();
}

function configurarNavegacaoEstudante() {
  document.querySelectorAll('.student-tab').forEach((botao) => {
    botao.addEventListener('click', () => {
      const painelAtivo = botao.dataset.panel;
      document.querySelectorAll('.student-tab').forEach((tab) => tab.classList.toggle('active', tab === botao));
      ['missionsPanel', 'learnPanel', 'projectsPanel', 'feedbackPanel', 'rallyPanel'].forEach((id) => {
        document.getElementById(id).hidden = id !== painelAtivo;
      });
      if (painelAtivo === 'feedbackPanel') carregarFeedbacks();
      if (painelAtivo === 'rallyPanel') carregarRalis();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

async function carregarRalis() {
  const lista = document.getElementById('rallyList');
  try { const ralis = await api('/aluno/ralis'); lista.replaceChildren(...ralis.map((rali) => { const card = document.createElement('article'); card.className = 'feedback-card'; const h = document.createElement('h3'); h.textContent = rali.titulo; const p = document.createElement('p'); p.textContent = rali.descricao; card.append(h, p); const b = document.createElement('button'); b.className = 'btn btn-primary'; b.textContent = rali.inscrito ? 'Inscrito' : 'Participar'; b.disabled = rali.inscrito; b.addEventListener('click', async () => { await api(`/aluno/ralis/${rali.id}/inscricao`, { method: 'POST' }); carregarRalis(); }); card.appendChild(b); return card; })); } catch (erro) { lista.textContent = erro.message; }
}

async function carregarFeedbacks() {
  const lista = document.getElementById('feedbackList');
  lista.replaceChildren(Object.assign(document.createElement('div'), { className: 'loading', textContent: 'Carregando feedbacks…' }));
  try {
    const feedbacks = await api('/aluno/feedbacks');
    if (!feedbacks.length) {
      lista.replaceChildren(Object.assign(document.createElement('div'), { className: 'empty-state', textContent: 'Ainda não há feedbacks individuais para você.' }));
      return;
    }
    lista.replaceChildren(...feedbacks.map((feedback) => {
      const cartao = document.createElement('article');
      cartao.className = 'feedback-card';
      const cabecalho = document.createElement('div');
      cabecalho.className = 'feedback-card-head';
      const professor = document.createElement('strong');
      professor.textContent = feedback.professor;
      const data = document.createElement('time');
      data.textContent = new Date(feedback.criado_em).toLocaleDateString('pt-BR');
      cabecalho.append(professor, data);
      const mensagem = document.createElement('p');
      mensagem.textContent = feedback.mensagem;
      cartao.append(cabecalho, mensagem);
      return cartao;
    }));
  } catch (erro) {
    lista.replaceChildren(Object.assign(document.createElement('div'), { className: 'empty-state', textContent: erro.message }));
  }
}

function configurarProjetos() {
  const campos = {
    titulo: document.getElementById('projectTitle'),
    problema: document.getElementById('projectProblem'),
    plano: document.getElementById('projectPlan'),
  };
  document.getElementById('projectForm').addEventListener('submit', (evento) => {
    evento.preventDefault();
    salvarProjeto(campos);
  });
  carregarProjetos();
}

async function salvarProjeto(campos) {
  const feedback = document.getElementById('projectFeedback');
  try {
    await api('/aluno/projetos', { method: 'POST', body: JSON.stringify({ titulo: campos.titulo.value.trim(), problema: campos.problema.value.trim(), plano: campos.plano.value.trim() }) });
    feedback.textContent = 'Projeto salvo. Envie quando estiver pronto.';
    feedback.className = 'feedback ok';
    document.getElementById('projectForm').reset();
    carregarProjetos();
  } catch (erro) { feedback.textContent = erro.message; feedback.className = 'feedback err'; }
}

async function carregarProjetos() {
  const lista = document.getElementById('projectSubmissions');
  try {
    const projetos = await api('/aluno/projetos');
    if (!projetos.length) { lista.textContent = 'Você ainda não criou um projeto.'; return; }
    lista.replaceChildren(...projetos.map((projeto) => {
      const card = document.createElement('article'); card.className = 'project-card';
      const titulo = document.createElement('h3'); titulo.textContent = projeto.titulo;
      const status = document.createElement('span'); status.className = `project-status ${projeto.status}`; status.textContent = projeto.status;
      const plano = document.createElement('p'); plano.textContent = projeto.plano;
      card.append(titulo, status, plano);
      if (projeto.devolutiva) { const devolutiva = document.createElement('p'); devolutiva.className = 'project-review'; devolutiva.textContent = `Revisão: ${projeto.devolutiva}`; card.appendChild(devolutiva); }
      if (projeto.status === 'rascunho') { const enviar = document.createElement('button'); enviar.className = 'btn btn-primary'; enviar.textContent = 'Entregar ao professor'; enviar.addEventListener('click', async () => { await api(`/aluno/projetos/${projeto.id}/enviar`, { method: 'POST' }); carregarProjetos(); }); card.appendChild(enviar); }
      return card;
    }));
  } catch (erro) { lista.textContent = erro.message; }
}

async function carregarPerfil() {
  try {
    const p = await api('/aluno/me');
    p.nome = escaparHtml(p.nome);
    p.turma = escaparHtml(p.turma);
    p.escola = escaparHtml(p.escola);
    const el = document.getElementById('profileRow');
    const iniciais = p.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
    const xpNoNivelPct = p.xpNoNivel; // já é 0-99 (xp % 100)
    el.innerHTML = `
        <div class="avatar" aria-label="Seu avatar">${escaparHtml(p.avatar || iniciais)}</div>
      <div class="profile-info">
        <div class="name">${p.nome} — ${p.turma || ''}</div>
        <div class="school">${escaparHtml(p.escola)}</div>
      </div>
      <div class="xp-wrap">
        <div class="xp-label"><span>Nível ${p.nivel}</span><span>${p.xp} XP total</span></div>
        <div class="xp-bar"><div class="xp-fill" style="width:${xpNoNivelPct}%"></div></div>
      </div>
      <div class="streak">🔥 ${p.streak} dias seguidos</div>
    `;
  } catch (err) {
    document.getElementById('profileRow').innerHTML = `<div class="loading">${escaparHtml(err.message)}</div>`;
  }
}

let missoesAtuais = [];

async function carregarTrilha() {
  try {
    missoesAtuais = await api('/aluno/trilha');
    const svg = document.getElementById('trailSvg');
    const espacamento = 165;
    const largura = Math.max(760, (missoesAtuais.length - 1) * espacamento + 130);
    const posicoes = missoesAtuais.map((_, indice) => ({
      x: 65 + indice * espacamento,
      y: indice % 2 === 0 ? 150 : 72,
    }));
    svg.setAttribute('viewBox', `0 0 ${largura} 220`);
    svg.replaceChildren();

    const caminho = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const d = posicoes.reduce((texto, posicao, indice) => {
      if (indice === 0) return `M${posicao.x},${posicao.y}`;
      const anterior = posicoes[indice - 1];
      const meio = (anterior.x + posicao.x) / 2;
      return `${texto} C${meio},${anterior.y} ${meio},${posicao.y} ${posicao.x},${posicao.y}`;
    }, '');
    caminho.setAttribute('d', d);
    caminho.setAttribute('fill', 'none');
    caminho.setAttribute('stroke', '#dcded5');
    caminho.setAttribute('stroke-width', '4');
    caminho.setAttribute('stroke-dasharray', '1,10');
    caminho.setAttribute('stroke-linecap', 'round');
    svg.appendChild(caminho);

    missoesAtuais.forEach((m, i) => {
      const pos = posicoes[i];
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'node ' + statusParaClasse(m.status));
      g.setAttribute('transform', `translate(${pos.x},${pos.y})`);
      const cor = m.status === 'concluida' ? '#12867a' : m.status === 'disponivel' ? '#e85d3f' : '#c7cbc3';
      const numero = m.status === 'concluida' ? '✓' : (i + 1);
      g.innerHTML = `
        <circle class="ring" r="22" stroke="${cor}"/>
        <text class="num" x="0" y="5" text-anchor="middle">${numero}</text>
        <text class="label" x="0" y="42" text-anchor="middle">${escaparHtml(m.titulo)}</text>
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
      el.innerHTML = `<div class="badge-icon">${escaparHtml(c.icone)}</div><div class="badge-title">${escaparHtml(c.titulo)}</div>`;
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

const cenarios = {
  1: { personagem: '🐱', alvo: '🍎', classe: 'pomar', titulo: 'Ajude a gata a encontrar a maçã', dica: 'Monte os comandos e veja a gata percorrer o pomar.', inicio: 'A' },
  2: { personagem: '🐝', alvo: '🌼', classe: 'jardim', titulo: 'A abelha precisa visitar as flores', dica: 'Use a repetição para economizar comandos no jardim.', inicio: 'Ninho' },
  3: { personagem: '🐸', alvo: '🪷', classe: 'lago', titulo: 'Atravesse o lago com a rã', dica: 'Escolha a decisão certa antes de avançar.', inicio: 'Margem' },
};

function ordemPedagogica(missao = missaoAtual) {
  const ordem = Number(missao?.ordem);
  if (Number.isInteger(ordem) && ordem > 0) return ordem;
  const porTitulo = {
    'sequência': 1,
    'repetição': 2,
    'condicional': 3,
    'variáveis': 4,
    'funções': 5,
    'depuração': 6,
    'projeto final': 7,
  };
  return porTitulo[String(missao?.titulo || '').trim().toLowerCase()] || 99;
}

function configurarAvatares() {
  const opcoes = ['🧑‍💻', '🧑‍🚀', '🦜', '🐝', '🐸', '🐱'];
  const area = document.getElementById('avatarChoices');
  area.replaceChildren(...opcoes.map((avatar) => {
    const botao = document.createElement('button'); botao.type = 'button'; botao.textContent = avatar; botao.title = 'Selecionar avatar';
    botao.addEventListener('click', async () => { try { await api('/aluno/avatar', { method: 'PATCH', body: JSON.stringify({ avatar }) }); carregarPerfil(); } catch (erro) { alert(erro.message); } });
    return botao;
  }));
}

function modoDaMissao() {
  return ordemPedagogica() <= 3 ? 'visual' : 'codigo';
}

async function abrirMissao(id) {
  try {
    missaoAtual = await api(`/aluno/missao/${id}`);
    picked = [];
    blocosEmbaralhados = missaoAtual.blocos.map((texto, idx) => ({ texto, idx })).sort(() => Math.random() - 0.5);

    document.getElementById('modalTitle').textContent = `Missão: ${missaoAtual.titulo}`;
    document.getElementById('modalDesc').textContent = missaoAtual.enunciado;
    document.getElementById('modalFeedback').textContent = '';
    document.getElementById('modalFeedback').className = 'feedback';
    const desafioVisual = modoDaMissao() === 'visual';
    document.getElementById('challengeLab').hidden = !desafioVisual;
    document.getElementById('codeLab').hidden = desafioVisual;
    document.getElementById('runProgram').disabled = true;
    if (desafioVisual) {
      configurarCenario();
      reiniciarCenario();
      renderBlocos();
    } else {
      prepararEditor();
    }
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
    });
    wrap.appendChild(b);
  });
  if (modoDaMissao() === 'visual') {
    document.getElementById('runProgram').disabled = picked.length !== blocosEmbaralhados.length;
  }
}

function configurarCenario() {
  const ordem = ordemPedagogica();
  const cenario = cenarios[ordem];
  const tabuleiro = document.getElementById('gameBoard');
  tabuleiro.className = `game-board ${cenario.classe}`;
  document.getElementById('gameBot').textContent = cenario.personagem;
  const alvo = document.getElementById('gameTarget');
  alvo.textContent = cenario.alvo;
  alvo.style.left = ordem === 1 ? '64px' : '126px';
  document.getElementById('gameStart').textContent = cenario.inicio;
  document.getElementById('labTitle').textContent = cenario.titulo;
  document.getElementById('labHint').textContent = cenario.dica;
}

function prepararEditor() {
  const bandeja = document.getElementById('snippetTray');
  const editor = document.getElementById('codeEditor');
  const titulos = {
    4: '8º ano · dados e variáveis',
    5: '8º ano · funções reutilizáveis',
    6: '9º ano · encontre e corrija o erro',
    7: '9º ano · organize um pequeno projeto',
  };
  document.querySelector('.code-lab-head span').textContent = titulos[ordemPedagogica()] || 'Editor de código guiado';
  editor.value = '';
  bandeja.replaceChildren();
  blocosEmbaralhados.forEach(({ texto }) => {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'snippet-btn';
    botao.textContent = `+ ${texto}`;
    botao.addEventListener('click', () => {
      editor.value += `${editor.value && !editor.value.endsWith('\n') ? '\n' : ''}${texto}\n`;
      editor.focus();
    });
    bandeja.appendChild(botao);
  });
}

function reiniciarCenario() {
  const robo = document.getElementById('gameBot');
  robo.style.transform = 'translate(0, 0) rotate(0deg)';
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function executarCenario() {
  const botao = document.getElementById('runProgram');
  if (botao.disabled) return;
  botao.disabled = true;
  reiniciarCenario();
  const robo = document.getElementById('gameBot');
  for (let passo = 0; passo < picked.length; passo += 1) {
    const indice = picked[passo];
    const comando = missaoAtual.blocos[indice];
    const x = ordemPedagogica() === 1 ? 62 : Math.min(passo + 1, 2) * 62;
    const y = passo === picked.length - 1 ? 62 : 0;
    const direcao = comando.startsWith('virar') ? 90 : 0;
    robo.style.transform = `translate(${x}px, ${y}px) rotate(${direcao}deg)`;
    await esperar(650);
  }
  await enviarTentativa();
  botao.disabled = false;
}

function ordemDoEditor() {
  const normalizar = (texto) => texto.trim().replace(/\s+/g, ' ');
  const linhas = document.getElementById('codeEditor').value.split('\n').map(normalizar).filter(Boolean);
  if (linhas.length !== missaoAtual.blocos.length) return null;
  const ordem = linhas.map((linha) => missaoAtual.blocos.findIndex((bloco) => normalizar(bloco) === linha));
  if (ordem.some((indice) => indice < 0) || new Set(ordem).size !== ordem.length) return null;
  return ordem;
}

async function executarCodigo() {
  const ordem = ordemDoEditor();
  const feedback = document.getElementById('modalFeedback');
  if (!ordem) {
    feedback.textContent = 'Use cada trecho uma vez, em linhas separadas.';
    feedback.className = 'feedback err';
    return;
  }
  picked = ordem;
  await enviarTentativa();
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
  if (modoDaMissao() === 'visual') renderBlocos();
  else prepararEditor();
  reiniciarCenario();
  document.getElementById('modalFeedback').textContent = '';
});
document.getElementById('runProgram').addEventListener('click', executarCenario);
document.getElementById('runCode').addEventListener('click', executarCodigo);
document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('overlay').classList.remove('active');
});
document.getElementById('overlay').addEventListener('click', (e) => {
  if (e.target.id === 'overlay') document.getElementById('overlay').classList.remove('active');
});
