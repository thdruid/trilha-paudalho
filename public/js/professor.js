const usuarioLogado = Sessao.exigirPapel('professor');

if (usuarioLogado) {
  document.getElementById('whoAmI').textContent = usuarioLogado.nome;
  document.getElementById('btnSair').addEventListener('click', Sessao.sair);
  init();
}

async function init() {
  await carregarRecursos();
  const turmas = await carregarTurmas();
  if (turmas.length) {
    document.getElementById('turmaSelect').addEventListener('change', (e) => {
      carregarEstudantes(e.target.value);
    });
    carregarEstudantes(turmas[0].id);
  }
}

async function carregarTurmas() {
  try {
    const turmas = await api('/professor/turmas');
    const select = document.getElementById('turmaSelect');
    select.innerHTML = turmas.map((t) => `<option value="${t.id}">${t.nome} — ${t.escola}</option>`).join('');
    return turmas;
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function carregarEstudantes(turmaId) {
  const body = document.getElementById('estudantesBody');
  body.innerHTML = `<tr><td colspan="4" class="loading">Carregando…</td></tr>`;
  try {
    const estudantes = await api(`/professor/turma/${turmaId}/estudantes`);
    body.innerHTML = estudantes.map((e) => `
      <tr>
        <td>${e.nome}</td>
        <td>${e.trilha_atual}</td>
        <td><span class="mini-bar"><span style="width:${e.progresso_pct}%"></span></span>${e.progresso_pct}%</td>
        <td>${formatarUltimaAtividade(e.dias_sem_atividade)}</td>
      </tr>
    `).join('');

    const emRisco = estudantes.filter((e) => e.dias_sem_atividade !== null && e.dias_sem_atividade >= 7);
    const alertBox = document.getElementById('alertBox');
    if (emRisco.length) {
      alertBox.innerHTML = `<div class="alert-box">⚠ ${emRisco.map(e => e.nome).join(', ')} ${emRisco.length > 1 ? 'estão' : 'está'} sem atividade há mais de 7 dias — considere uma intervenção pedagógica.</div>`;
    } else {
      alertBox.innerHTML = '';
    }
  } catch (err) {
    body.innerHTML = `<tr><td colspan="4" class="loading">${err.message}</td></tr>`;
  }
}

function formatarUltimaAtividade(dias) {
  if (dias === null) return '—';
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'ontem';
  return `há ${dias} dias`;
}

async function carregarRecursos() {
  try {
    const recursos = await api('/professor/recursos');
    document.getElementById('recursosList').innerHTML = recursos.map((r) => `
      <div class="resource">
        <div>${r.titulo}<div class="tag">${r.tag}</div></div>
        <span class="tag">${r.formato}</span>
      </div>
    `).join('');
  } catch (err) {
    document.getElementById('recursosList').innerHTML = `<div class="loading">${err.message}</div>`;
  }
}
