const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  test('integração PostgreSQL requer DATABASE_URL', { skip: true }, () => {});
} else {
  const { criarApp } = require('../src/server');
  let servidor;
  let baseUrl;

  before(async () => {
    servidor = criarApp().listen(0);
    await new Promise((resolve) => servidor.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${servidor.address().port}/api`;
  });

  after(() => servidor.close());

  test('Supabase atende login e preserva isolamento entre turmas', async () => {
    const health = await fetch(`${baseUrl}/health`);
    assert.deepEqual(await health.json(), { ok: true, database: 'ok' });
    const login = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'carlos.andrade@seduc.paudalho.pe.gov.br', senha: '123456' }),
    });
    assert.equal(login.status, 200);
    const { token } = await login.json();
    const bloqueada = await fetch(`${baseUrl}/professor/turma/3/estudantes`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(bloqueada.status, 403);
    const permitida = await fetch(`${baseUrl}/professor/turma/1/estudantes`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(permitida.status, 200);
  });
}
