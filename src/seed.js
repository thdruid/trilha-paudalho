const bcrypt = require('bcryptjs');
if (process.env.NODE_ENV === 'production') throw new Error('O seed de demonstração não pode ser executado em produção.');
process.env.DB_DRIVER = 'json';
const { writeDB } = require('./db');

const hash = (senha) => bcrypt.hashSync(senha, 8);

// ---------------------------------------------------------------------------
// Escolas e turmas
// ---------------------------------------------------------------------------
const escolas = [
  { id: 1, nome: 'E.M. Professora Aurora Lins' },
  { id: 2, nome: 'E.M. José do Nascimento' },
  { id: 3, nome: 'E.M. Sítio Novo' },
];

const turmas = [
  { id: 1, escola_id: 1, nome: '7º B', serie: 7 },
  { id: 2, escola_id: 1, nome: '6º A', serie: 6 },
  { id: 3, escola_id: 2, nome: '9º C', serie: 9 },
];

// ---------------------------------------------------------------------------
// Trilha única de BNCC Computação (Anos Finais) com 7 missões em sequência.
// Cada missão é um desafio de "ordenar os blocos" (sequenciamento lógico),
// adequado a um MVP jogável sem precisar de um editor de blocos completo.
// ---------------------------------------------------------------------------
const trilhas = [
  { id: 1, titulo: 'Algoritmos e Programação', ordem: 1 },
];

const missoes = [
  {
    id: 1, trilha_id: 1, ordem: 1, titulo: 'Sequência',
    enunciado: 'Ordene os blocos para o robô sair do início e chegar até a maçã.',
    blocos: ['mover(1 passo à frente)', 'virar(direita)', 'mover(1 passo à frente)'],
    ordem_correta: [0, 1, 2],
    xp: 30,
  },
  {
    id: 2, trilha_id: 1, ordem: 2, titulo: 'Repetição',
    enunciado: 'Use um laço de repetição para o robô coletar as 3 moedas no caminho reto.',
    blocos: ['repetir 3 vezes {', 'mover(1 passo à frente)', '}'],
    ordem_correta: [0, 1, 2],
    xp: 35,
  },
  {
    id: 3, trilha_id: 1, ordem: 3, titulo: 'Condicional',
    enunciado: 'Monte a lógica: se houver obstáculo, o robô desvia; senão, segue em frente.',
    blocos: ['se (tem_obstaculo) {', 'desviar()', '} senão {', 'mover(1 passo à frente)', '}'],
    ordem_correta: [0, 1, 2, 3, 4],
    xp: 40,
  },
  {
    id: 4, trilha_id: 1, ordem: 4, titulo: 'Variáveis',
    enunciado: 'Ordene os blocos para guardar a quantidade de garrafas coletadas e mostrar o total.',
    blocos: ['definir total = 0', 'total = total + garrafas_coletadas', 'mostrar(total)'],
    ordem_correta: [0, 1, 2],
    xp: 40,
  },
  {
    id: 5, trilha_id: 1, ordem: 5, titulo: 'Funções',
    enunciado: 'Organize a criação e o uso de uma função que calcula a média de duas notas.',
    blocos: ['função media(a, b) {', 'retornar (a + b) / 2', '}', 'mostrar(media(7, 9))'],
    ordem_correta: [0, 1, 2, 3],
    xp: 45,
  },
  {
    id: 6, trilha_id: 1, ordem: 6, titulo: 'Depuração',
    enunciado: 'Corrija a ordem lógica para o contador funcionar corretamente até 5.',
    blocos: ['definir contador = 0', 'enquanto (contador < 5) {', 'contador = contador + 1', '}'],
    ordem_correta: [0, 1, 2, 3],
    xp: 45,
  },
  {
    id: 7, trilha_id: 1, ordem: 7, titulo: 'Projeto Final',
    enunciado: 'Monte a estrutura geral de um app simples de coleta seletiva para a comunidade.',
    blocos: ['definir pontos_coleta = []', 'para cada bairro {', 'cadastrar(ponto_coleta)', '}', 'mostrar(mapa(pontos_coleta))'],
    ordem_correta: [0, 1, 2, 3, 4],
    xp: 60,
  },
];

// ---------------------------------------------------------------------------
// Conquistas (critérios avaliados no backend ao concluir uma missão)
// ---------------------------------------------------------------------------
const conquistas = [
  { id: 1, titulo: 'Primeira sequência', icone: '🧩', criterio: 'missao_1_concluida' },
  { id: 2, titulo: 'Mestre do loop', icone: '🔁', criterio: 'missao_2_concluida' },
  { id: 3, titulo: 'Lógica afiada', icone: '🧠', criterio: 'missao_3_concluida' },
  { id: 4, titulo: 'Depurador', icone: '⚙️', criterio: 'missao_6_concluida' },
  { id: 5, titulo: 'Trilha completa', icone: '🏆', criterio: 'trilha_1_completa' },
];

// ---------------------------------------------------------------------------
// Usuários (senha de demonstração para todos: 123456)
// ---------------------------------------------------------------------------
const usuarios = [
  // Alunos da turma 1 (7º B)
  { id: 1, nome: 'Maria Julia Souza', email: 'mariajulia@aluno.paudalho.pe.gov.br', senha_hash: hash('123456'), papel: 'aluno', turma_id: 1 },
  { id: 2, nome: 'Pedro Henrique Oliveira', email: 'pedro@aluno.paudalho.pe.gov.br', senha_hash: hash('123456'), papel: 'aluno', turma_id: 1 },
  { id: 3, nome: 'Ana Beatriz Costa', email: 'anabeatriz@aluno.paudalho.pe.gov.br', senha_hash: hash('123456'), papel: 'aluno', turma_id: 1 },
  { id: 4, nome: 'Lucas Gabriel Melo', email: 'lucas@aluno.paudalho.pe.gov.br', senha_hash: hash('123456'), papel: 'aluno', turma_id: 1 },
  { id: 5, nome: 'Sofia Emanuelly Rocha', email: 'sofia@aluno.paudalho.pe.gov.br', senha_hash: hash('123456'), papel: 'aluno', turma_id: 1 },
  // Professor da turma 1
  { id: 6, nome: 'Prof. Carlos Andrade', email: 'carlos.andrade@seduc.paudalho.pe.gov.br', senha_hash: hash('123456'), papel: 'professor', turmas_ids: [1, 2] },
  // Gestor da rede
  { id: 7, nome: 'Secretaria de Educação', email: 'gestao@seduc.paudalho.pe.gov.br', senha_hash: hash('123456'), papel: 'gestor' },
];

// ---------------------------------------------------------------------------
// Progresso inicial: só o aluno "Maria Julia" (id 1) tem histórico simulado,
// para a tela de estudante já abrir com uma trilha parcialmente percorrida.
// Os demais começam do zero (só a missão 1 disponível).
// ---------------------------------------------------------------------------
function progressoInicialAluno(usuarioId, missoesConcluidas = []) {
  return missoes.map((m) => {
    let status = 'bloqueada';
    if (m.ordem === 1) status = 'disponivel';
    if (missoesConcluidas.includes(m.id)) status = 'concluida';
    // desbloqueia a próxima missão após a última concluída
    const proxima = missoes.find((x) => x.ordem === m.ordem);
    return { usuario_id: usuarioId, missao_id: m.id, status, tentativas: 0, concluida_em: null };
  });
}

function aplicarDesbloqueios(progressoAluno) {
  // percorre em ordem e desbloqueia a próxima missão após cada concluída
  const porOrdem = [...missoes].sort((a, b) => a.ordem - b.ordem);
  for (let i = 0; i < porOrdem.length - 1; i++) {
    const atual = progressoAluno.find((p) => p.missao_id === porOrdem[i].id);
    const proxima = progressoAluno.find((p) => p.missao_id === porOrdem[i + 1].id);
    if (atual.status === 'concluida' && proxima.status === 'bloqueada') {
      proxima.status = 'disponivel';
    }
  }
  return progressoAluno;
}

let progresso = [];
// Maria Julia: concluiu as 3 primeiras missões
let pMaria = progressoInicialAluno(1, [1, 2, 3]);
pMaria = aplicarDesbloqueios(pMaria);
pMaria.forEach((p) => { if (p.status === 'concluida') p.concluida_em = new Date().toISOString(); });
progresso.push(...pMaria);

// Pedro: concluiu 1 missão
let pPedro = progressoInicialAluno(2, [1]);
pPedro = aplicarDesbloqueios(pPedro);
progresso.push(...pPedro);

// Ana Beatriz: quase terminou a trilha
let pAna = progressoInicialAluno(3, [1, 2, 3, 4, 5, 6]);
pAna = aplicarDesbloqueios(pAna);
progresso.push(...pAna);

// Lucas: nenhuma concluída (aluno em risco / inativo)
progresso.push(...progressoInicialAluno(4, []));

// Sofia: concluiu 2
let pSofia = progressoInicialAluno(5, [1, 2]);
pSofia = aplicarDesbloqueios(pSofia);
progresso.push(...pSofia);

// ---------------------------------------------------------------------------
// Conquistas já obtidas (derivadas do progresso simulado acima)
// ---------------------------------------------------------------------------
const usuario_conquistas = [
  { usuario_id: 1, conquista_id: 1, obtida_em: new Date().toISOString() },
  { usuario_id: 1, conquista_id: 2, obtida_em: new Date().toISOString() },
  { usuario_id: 1, conquista_id: 3, obtida_em: new Date().toISOString() },
  { usuario_id: 3, conquista_id: 1, obtida_em: new Date().toISOString() },
  { usuario_id: 3, conquista_id: 2, obtida_em: new Date().toISOString() },
  { usuario_id: 3, conquista_id: 3, obtida_em: new Date().toISOString() },
  { usuario_id: 3, conquista_id: 4, obtida_em: new Date().toISOString() },
];

// último acesso simulado (para calcular "dias sem atividade" no painel do professor)
const hoje = new Date();
const diasAtras = (n) => new Date(hoje.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

const ultimo_acesso = {
  1: diasAtras(0),
  2: diasAtras(1),
  3: diasAtras(0),
  4: diasAtras(9),
  5: diasAtras(2),
};

const streak = { 1: 6, 2: 2, 3: 9, 4: 0, 5: 3 };

const db = {
  escolas,
  turmas,
  usuarios,
  trilhas,
  missoes,
  progresso,
  conquistas,
  usuario_conquistas,
  ultimo_acesso,
  streak,
};

writeDB(db);
console.log('Banco de dados criado em data/db.json');
console.log('');
console.log('Usuários de demonstração (senha para todos: 123456):');
console.log('  Aluno:      mariajulia@aluno.paudalho.pe.gov.br');
console.log('  Professor:  carlos.andrade@seduc.paudalho.pe.gov.br');
console.log('  Gestor:     gestao@seduc.paudalho.pe.gov.br');
