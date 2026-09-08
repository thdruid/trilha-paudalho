const usuarioLogado = Sessao.exigirPapel('professor');

if (usuarioLogado) {
  document.getElementById('whoAmI').textContent = usuarioLogado.nome;
  document.getElementById('btnSair').addEventListener('click', Sessao.sair);
  init();
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
  const turmas = await carregarTurmas();
  if (turmas.length) {
    document.getElementById('turmaSelect').addEventListener('change', (e) => carregarEstudantes(e.target.value));
    carregarEstudantes(turmas[0].id);
  }
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
  mostrarCarregando(body, 'Carregando…', 4);
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
      return linha;
    }));

    const emRisco = estudantes.filter((e) => e.dias_sem_atividade !== null && e.dias_sem_atividade >= 7);
    const alertBox = document.getElementById('alertBox');
    alertBox.replaceChildren();
    if (emRisco.length) {
      const alerta = document.createElement('div');
      alerta.className = 'alert-box';
      alerta.textContent = `⚠ ${emRisco.map((e) => e.nome).join(', ')} ${emRisco.length > 1 ? 'estão' : 'está'} sem atividade há mais de 7 dias — considere uma intervenção pedagógica.`;
      alertBox.appendChild(alerta);
    }
  } catch (err) {
    mostrarCarregando(body, err.message, 4);
  }
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
      const formato = document.createElement('span');
      formato.className = 'tag';
      formato.textContent = recurso.formato || '';
      item.append(conteudo, formato);
      return item;
    }));
  } catch (err) {
    mostrarCarregando(lista, err.message);
  }
}
