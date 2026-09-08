const usuarioLogado = Sessao.exigirPapel('professor');
let estudanteSelecionado = null;

if (usuarioLogado) {
  document.getElementById('whoAmI').textContent = usuarioLogado.nome;
  document.getElementById('btnSair').addEventListener('click', Sessao.sair);
  document.getElementById('feedbackForm').addEventListener('submit', enviarFeedback);
  document.getElementById('closeFeedback').addEventListener('click', fecharFeedback);
  document.getElementById('studentRegistration').addEventListener('submit', cadastrarEstudante);
  init();
}

async function cadastrarEstudante(evento) {
  evento.preventDefault(); const status = document.getElementById('registrationStatus');
  try { await api(`/professor/turma/${document.getElementById('turmaSelect').value}/estudantes`, { method: 'POST', body: JSON.stringify({ nome: document.getElementById('studentName').value, email: document.getElementById('studentEmail').value, senha: document.getElementById('studentPassword').value }) }); status.textContent = 'Estudante cadastrado.'; status.className = 'feedback ok'; evento.target.reset(); carregarEstudantes(document.getElementById('turmaSelect').value); } catch (erro) { status.textContent = erro.message; status.className = 'feedback err'; }
}

function mostrarCarregando(elemento, texto, colspan = null) {
  elemento.replaceChildren();
  const loading = document.createElement(colspan ? 'tr' : 'div');
  const alvo = colspan ? document.createElement('td') : loading;
  alvo.className = 'loading';
  alvo.textContent = texto;
  if (colspan) {
    alvo.colSpan = colspan;
    loading.appendChild(alvo);
  }
  elemento.appendChild(loading);
}

async function init() {
  await carregarRecursos();
  carregarProjetosEntregues();
  const turmas = await carregarTurmas();
  if (turmas.length) {
    document.getElementById('turmaSelect').addEventListener('change', (e) => carregarEstudantes(e.target.value));
    carregarEstudantes(turmas[0].id);
  }
}

async function carregarProjetosEntregues() {
  const lista = document.getElementById('teacherProjects');
  try {
    const projetos = await api('/professor/projetos');
    if (!projetos.length) { lista.textContent = 'Nenhum projeto entregue até agora.'; return; }
    lista.replaceChildren(...projetos.map((projeto) => {
      const card = document.createElement('article'); card.className = 'project-card';
      const titulo = document.createElement('h3'); titulo.textContent = `${projeto.titulo} — ${projeto.aluno}`;
      const problema = document.createElement('p'); problema.textContent = projeto.problema;
      card.append(titulo, problema);
      if (projeto.status === 'enviado') { const botao = document.createElement('button'); botao.className = 'btn btn-primary'; botao.textContent = 'Revisar'; botao.addEventListener('click', async () => { const devolutiva = window.prompt('Escreva uma devolutiva para o estudante:'); if (!devolutiva) return; await api(`/professor/projetos/${projeto.id}/revisao`, { method: 'POST', body: JSON.stringify({ devolutiva }) }); carregarProjetosEntregues(); }); card.appendChild(botao); }
      else { const revisao = document.createElement('p'); revisao.className = 'project-review'; revisao.textContent = `Revisado: ${projeto.devolutiva}`; card.appendChild(revisao); }
      return card;
    }));
  } catch (erro) { lista.textContent = erro.message; }
}

async function carregarTurmas() {
  try {
    const turmas = await api('/professor/turmas');
    const select = document.getElementById('turmaSelect');
    select.replaceChildren(...turmas.map((turma) => {
      const option = document.createElement('option');
      option.value = turma.id;
      option.textContent = `${turma.nome} — ${turma.escola || ''}`;
      return option;
    }));
    return turmas;
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function carregarEstudantes(turmaId) {
  const body = document.getElementById('estudantesBody');
  mostrarCarregando(body, 'Carregando…', 5);
  try {
    const estudantes = await api(`/professor/turma/${turmaId}/estudantes`);
    body.replaceChildren(...estudantes.map((estudante) => {
      const linha = document.createElement('tr');
      const progresso = Math.max(0, Math.min(100, Number(estudante.progresso_pct) || 0));
      const barra = document.createElement('span');
      barra.className = 'mini-bar';
      const preenchimento = document.createElement('span');
      preenchimento.style.width = `${progresso}%`;
      barra.appendChild(preenchimento);
      const celulaProgresso = document.createElement('td');
      celulaProgresso.append(barra, `${progresso}%`);
      [estudante.nome, estudante.trilha_atual].forEach((texto) => {
        const celula = document.createElement('td');
        celula.textContent = texto || '—';
        linha.appendChild(celula);
      });
      linha.appendChild(celulaProgresso);
      const ultimaAtividade = document.createElement('td');
      ultimaAtividade.textContent = formatarUltimaAtividade(estudante.dias_sem_atividade);
      linha.appendChild(ultimaAtividade);
      const acao = document.createElement('td');
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'table-action';
      botao.textContent = 'Feedback';
      botao.addEventListener('click', () => abrirFeedback(estudante, turmaId));
      acao.appendChild(botao);
      linha.appendChild(acao);
      return linha;
    }));

    const emRisco = estudantes.filter((e) => e.dias_sem_atividade !== null && e.dias_sem_atividade >= 7);
    renderizarResumoTurma(estudantes, emRisco);
    const alertBox = document.getElementById('alertBox');
    alertBox.replaceChildren();
    if (emRisco.length) {
      const alerta = document.createElement('div');
      alerta.className = 'alert-box';
      alerta.textContent = `⚠ ${emRisco.map((e) => e.nome).join(', ')} ${emRisco.length > 1 ? 'estão' : 'está'} sem atividade há mais de 7 dias — considere uma intervenção pedagógica.`;
      alertBox.appendChild(alerta);
    }
  } catch (err) {
    mostrarCarregando(body, err.message, 5);
  }
}

function abrirFeedback(estudante, turmaId) {
  estudanteSelecionado = { id: estudante.id, turmaId, nome: estudante.nome };
  document.getElementById('feedbackStudent').textContent = `Feedback para ${estudante.nome}`;
  document.getElementById('feedbackMessage').value = '';
  document.getElementById('feedbackStatus').textContent = '';
  document.getElementById('feedbackComposer').hidden = false;
  document.getElementById('feedbackComposer').scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.getElementById('feedbackMessage').focus();
}

function fecharFeedback() {
  estudanteSelecionado = null;
  document.getElementById('feedbackComposer').hidden = true;
}

async function enviarFeedback(evento) {
  evento.preventDefault();
  if (!estudanteSelecionado) return;
  const status = document.getElementById('feedbackStatus');
  const mensagem = document.getElementById('feedbackMessage').value.trim();
  status.textContent = 'Enviando…';
  status.className = 'feedback';
  try {
    await api(`/professor/turma/${estudanteSelecionado.turmaId}/estudante/${estudanteSelecionado.id}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ mensagem }),
    });
    status.textContent = 'Feedback enviado de forma privada.';
    status.className = 'feedback ok';
    document.getElementById('feedbackMessage').value = '';
  } catch (erro) {
    status.textContent = erro.message;
    status.className = 'feedback err';
  }
}

function renderizarResumoTurma(estudantes, emRisco) {
  const destino = document.getElementById('teacherSummary');
  if (!estudantes.length) {
    destino.replaceChildren();
    return;
  }
  const media = Math.round(estudantes.reduce((soma, estudante) => soma + (Number(estudante.progresso_pct) || 0), 0) / estudantes.length);
  const itens = [
    [String(estudantes.length), 'estudantes acompanhados'],
    [`${media}%`, 'progresso médio da turma'],
    [String(emRisco.length), 'precisam de atenção'],
  ];
  destino.replaceChildren(...itens.map(([valor, texto]) => {
    const cartao = document.createElement('div');
    cartao.className = 'teacher-stat';
    const numero = document.createElement('strong');
    numero.textContent = valor;
    const rotulo = document.createElement('span');
    rotulo.textContent = texto;
    cartao.append(numero, rotulo);
    return cartao;
  }));
}

function formatarUltimaAtividade(dias) {
  if (dias === null) return '—';
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'ontem';
  return `há ${dias} dias`;
}

async function carregarRecursos() {
  const lista = document.getElementById('recursosList');
  try {
    const recursos = await api('/professor/recursos');
    lista.replaceChildren(...recursos.map((recurso) => {
      const item = document.createElement('div');
      item.className = 'resource';
      const conteudo = document.createElement('div');
      conteudo.append(document.createTextNode(recurso.titulo || ''));
      const tag = document.createElement('div');
      tag.className = 'tag';
      tag.textContent = recurso.tag || '';
      conteudo.appendChild(tag);
      const formato = document.createElement(recurso.url ? 'a' : 'span');
      formato.className = recurso.url ? 'table-action' : 'tag';
      formato.textContent = recurso.formato || '';
      if (recurso.url) { formato.href = recurso.url; formato.target = '_blank'; formato.rel = 'noopener'; }
      item.append(conteudo, formato);
      return item;
    }));
  } catch (err) {
    mostrarCarregando(lista, err.message);
  }
}
