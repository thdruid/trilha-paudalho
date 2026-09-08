const assert = require('node:assert/strict');
process.env.DB_DRIVER = 'json';
const { before, after, test } = require('node:test');
const { execFileSync, spawnSync } = require('node:child_process');
const bcrypt = require('bcryptjs');
const { criarApp } = require('../src/server');
const { readDB, writeDB } = require('../src/db');

let servidor;
let baseUrl;

before(async () => {
  execFileSync(process.execPath, ['src/seed.js'], { stdio: 'ignore', cwd: process.cwd() });
  const db = readDB();
  db.usuarios.push({
    id: 8,
    nome: 'Professora de outra escola',
    email: 'outra.professora@seduc.paudalho.pe.gov.br',
    senha_hash: bcrypt.hashSync('123456', 8),
    papel: 'professor',
    turmas_ids: [3],
  });
  writeDB(db);
  servidor = criarApp().listen(0);
  await new Promise((resolve) => servidor.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${servidor.address().port}/api`;
});

after(() => {
  servidor.close();
  execFileSync(process.execPath, ['src/seed.js'], { stdio: 'ignore', cwd: process.cwd() });
});

async function requisicao(caminho, opcoes = {}) {
  const resposta = await fetch(`${baseUrl}${caminho}`, opcoes);
  return { status: resposta.status, corpo: await resposta.json() };
}

async function login(email, senha = '123456') {
  const resposta = await requisicao('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  });
  assert.equal(resposta.status, 200);
  return resposta.corpo.token;
}

function autenticado(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

test('login rejeita credenciais inválidas e gera sessão para credenciais válidas', async () => {
  const invalido = await requisicao('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'mariajulia@aluno.paudalho.pe.gov.br', senha: 'errada' }),
  });
  assert.equal(invalido.status, 401);
  assert.ok(await login('mariajulia@aluno.paudalho.pe.gov.br'));
});

test('API envia cabeçalhos básicos de segurança', async () => {
  const resposta = await fetch(`${baseUrl}/health`);
  assert.equal(resposta.headers.get('x-powered-by'), null);
  assert.equal(resposta.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(resposta.headers.get('x-frame-options'), 'DENY');
  assert.match(resposta.headers.get('content-security-policy'), /default-src 'self'/);
});

test('interface expõe os recursos necessários para instalação como PWA', async () => {
  const origem = baseUrl.replace('/api', '');
  const manifesto = await fetch(`${origem}/manifest.webmanifest`);
  assert.equal(manifesto.status, 200);
  assert.equal((await manifesto.json()).display, 'standalone');
  const serviceWorker = await fetch(`${origem}/sw.js`);
  assert.equal(serviceWorker.status, 200);
  assert.match(await serviceWorker.text(), /trilha-paudalho-v1/);
});

test('rotas exigem o papel correto', async () => {
  const aluno = await login('mariajulia@aluno.paudalho.pe.gov.br');
  assert.equal((await requisicao('/professor/turmas', autenticado(aluno))).status, 403);
});

test('professor só visualiza estudantes das próprias turmas', async () => {
  const carlos = await login('carlos.andrade@seduc.paudalho.pe.gov.br');
  const outraProfessora = await login('outra.professora@seduc.paudalho.pe.gov.br');
  assert.equal((await requisicao('/professor/turma/1/estudantes', autenticado(carlos))).status, 200);
  assert.equal((await requisicao('/professor/turma/3/estudantes', autenticado(carlos))).status, 403);
  assert.equal((await requisicao('/professor/turma/1/estudantes', autenticado(outraProfessora))).status, 403);
  assert.equal((await requisicao('/professor/turma/3/estudantes', autenticado(outraProfessora))).status, 200);
});

test('acerto concede XP uma vez e desbloqueia a próxima missão', async () => {
  const aluno = await login('lucas@aluno.paudalho.pe.gov.br');
  const tentativa = () => requisicao('/aluno/missao/1/tentativa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aluno}` },
    body: JSON.stringify({ ordem: [0, 1, 2] }),
  });
  const primeira = await tentativa();
  assert.equal(primeira.status, 200);
  assert.equal(primeira.corpo.xp_ganho, 30);
  assert.equal((await tentativa()).corpo.xp_ganho, 0);
  const perfil = await requisicao('/aluno/me', autenticado(aluno));
  assert.equal(perfil.corpo.xp, 30);
  assert.equal(perfil.corpo.nivel, 1);
  const trilha = await requisicao('/aluno/trilha', autenticado(aluno));
  assert.equal(trilha.corpo.find((m) => m.id === 2).status, 'disponivel');
});

test('login limita tentativas repetidas no mesmo endereço', async () => {
  const opcoes = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'inexistente@exemplo.com', senha: 'errada' }),
  };
  for (let tentativa = 0; tentativa < 4; tentativa += 1) {
    assert.equal((await requisicao('/auth/login', opcoes)).status, 401);
  }
  const bloqueada = await requisicao('/auth/login', opcoes);
  assert.equal(bloqueada.status, 429);
  assert.match(bloqueada.corpo.erro, /Muitas tentativas/);
});

test('produção exige uma chave JWT forte', () => {
  const resultado = spawnSync(process.execPath, ['-e', "require('./src/auth')"], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: 'production', JWT_SECRET: '' },
  });
  assert.notEqual(resultado.status, 0);
  assert.match(resultado.stderr.toString(), /JWT_SECRET deve ter ao menos 32 caracteres/);
});
