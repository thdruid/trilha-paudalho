const API_BASE = '/api';
const FILA_OFFLINE = 'tp_fila_offline';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((erro) => console.warn('Não foi possível ativar o modo offline.', erro));
  });
}

// Use this when a server-provided value needs to be rendered inside innerHTML.
function escaparHtml(valor) {
  return String(valor ?? '').replace(/[&<>'"]/g, (caractere) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[caractere]));
}

function paginaDoPapel(papel) {
  return papel === 'gestor' ? 'gestao.html' : `${papel}.html`;
}

const Sessao = {
  salvar(token, usuario) {
    localStorage.setItem('tp_token', token);
    localStorage.setItem('tp_usuario', JSON.stringify(usuario));
  },
  token() {
    return localStorage.getItem('tp_token');
  },
  usuario() {
    const raw = localStorage.getItem('tp_usuario');
    return raw ? JSON.parse(raw) : null;
  },
  sair() {
    localStorage.removeItem('tp_token');
    localStorage.removeItem('tp_usuario');
    window.location.href = '/index.html';
  },
  exigirPapel(papel) {
    const u = Sessao.usuario();
    if (!u || !Sessao.token()) {
      window.location.href = '/index.html';
      return null;
    }
    if (u.papel !== papel) {
      // manda para a home correta do papel do usuário
      window.location.href = `/${paginaDoPapel(u.papel)}`;
      return null;
    }
    return u;
  },
};

async function api(path, opts = {}) {
  const headers = Object.assign(
    { 'Content-Type': 'application/json' },
    opts.headers || {}
  );
  const token = Sessao.token();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try { res = await fetch(API_BASE + path, { ...opts, headers }); } catch (erro) {
    const filaPermitida = opts.method === 'POST' && (/^\/aluno\/(projetos|missao\/\d+\/tentativa|ralis)/).test(path);
    if (!filaPermitida) throw erro;
    const fila = JSON.parse(localStorage.getItem(FILA_OFFLINE) || '[]');
    fila.push({ path, opts: { method: opts.method, body: opts.body }, usuarioId: Sessao.usuario()?.id, criadoEm: new Date().toISOString() });
    localStorage.setItem(FILA_OFFLINE, JSON.stringify(fila));
    return { offline: true, mensagem: 'Ação salva no aparelho e será sincronizada ao reconectar.' };
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.erro || `Erro ${res.status}`);
  }
  return data;
}

async function sincronizarFilaOffline() {
  const usuario = Sessao.usuario(); const fila = JSON.parse(localStorage.getItem(FILA_OFFLINE) || '[]'); const restante = [];
  for (const item of fila) {
    if (!usuario || item.usuarioId !== usuario.id) { restante.push(item); continue; }
    try { await api(item.path, item.opts); } catch (_) { restante.push(item); }
  }
  localStorage.setItem(FILA_OFFLINE, JSON.stringify(restante));
}

window.addEventListener('online', sincronizarFilaOffline);
window.addEventListener('load', sincronizarFilaOffline);
