// Camada de dados simples baseada em arquivo JSON.
// Escolhida no lugar de um driver nativo (sqlite3/better-sqlite3) para que o
// projeto instale e rode em qualquer máquina sem compilador C/C++ instalado.
// Para produção real, trocar por Postgres/MySQL é o próximo passo natural —
// toda a lógica de negócio já fica isolada nas rotas, então a troca não exige
// reescrever as regras, só esta camada.

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

if (process.env.DATABASE_URL && process.env.DB_DRIVER !== 'json') {
  module.exports = require('./db-postgres');
  return;
}

function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error('Banco de dados não encontrado. Rode "npm run seed" primeiro.');
  }
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeDB(data) {
  // The rename only happens after the whole JSON document has been written.
  // Synchronous route handlers serialize read-modify-write in one Node process;
  // multi-process deployments still require a proper database.
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const tempPath = `${DB_PATH}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, DB_PATH);
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}

// Gera IDs incrementais simples e estáveis por coleção.
function nextId(collection) {
  if (!collection.length) return 1;
  return Math.max(...collection.map((item) => item.id)) + 1;
}

module.exports = { readDB, writeDB, nextId, DB_PATH };
