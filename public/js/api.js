const API_BASE = '/api';

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
      window.location.href = `/${u.papel}.html`;
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

  const res = await fetch(API_BASE + path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.erro || `Erro ${res.status}`);
  }
  return data;
}
