# Trilha Paudalho

> Nota de segurança: o JWT permanece em `localStorage` neste MVP para manter o
> front-end estático simples. Para produção, migrar para cookie `HttpOnly`,
> `Secure` e `SameSite`, acompanhado de proteção CSRF.
> Para iniciar em produção, defina também `JWT_SECRET` com uma chave aleatória
> de pelo menos 32 caracteres; a aplicação rejeita a chave padrão nesse ambiente.

Plataforma gamificada de aprendizagem de Algoritmos e Programação (BNCC Computação)
para os Anos Finais do Ensino Fundamental — protótipo funcional desenvolvido em
resposta ao Desafio de Transformação Digital da Prefeitura Municipal de Paudalho/PE.

Este é um **MVP real**: backend com API, autenticação por papel, banco de dados
persistente e front-end funcional para os três eixos pedidos no edital —
**Ambiente do Estudante**, **Ambiente do Professor** e **Painel de Gestão** — não
é um mockup estático. Toda a lógica (progresso, XP, desbloqueio de missões,
conquistas, indicadores agregados) roda de verdade no servidor.

## Como rodar

Pré-requisito: [Node.js](https://nodejs.org) versão 18 ou superior.

```bash
npm install       # instala as dependências
npm run seed      # cria o banco de dados com dados de demonstração
npm start         # sobe o servidor em http://localhost:4000
npm test          # executa os testes de integração
```

Abra **http://localhost:4000** no navegador. A tela de login tem botões de
acesso rápido para os três perfis de demonstração (senha `123456` para todos):

| Perfil     | E-mail                                          |
|------------|--------------------------------------------------|
| Estudante  | mariajulia@aluno.paudalho.pe.gov.br              |
| Professor  | carlos.andrade@seduc.paudalho.pe.gov.br          |
| Gestão     | gestao@seduc.paudalho.pe.gov.br                  |

Para voltar ao estado inicial de demonstração a qualquer momento, rode
`npm run seed` novamente (isso recria `data/db.json` do zero).

## O que já funciona de verdade

- **Login com sessão (JWT)** e proteção de rotas por papel — um estudante não
  consegue chamar as rotas do professor nem da gestão (e vice-versa), testado
  com resposta `403`.
- **Ambiente do Estudante**: trilha com 7 missões de Algoritmos e Programação
  (Sequência → Repetição → Condicional → Variáveis → Funções → Depuração →
  Projeto Final), cada uma um desafio real de ordenar blocos de lógica. Acertar
  concede XP, sobe de nível, desbloqueia a próxima missão e pode conceder
  conquistas — tudo validado e persistido no servidor.
- **Ambiente do Professor**: lista de turmas do professor logado, progresso
  individual de cada estudante calculado a partir do banco, e um alerta
  automático para estudantes sem atividade há 7+ dias.
- **Painel de Gestão**: indicadores agregados (estudantes ativos, escolas
  participantes, taxa média de conclusão, missões concluídas), participação
  por escola e por série — todos calculados em tempo real a partir dos dados
  de progresso, não são números fixos.

## Arquitetura

```
trilha-paudalho/
├── data/
│   └── db.json            # "banco de dados" (arquivo JSON), gerado pelo seed
├── src/
│   ├── server.js          # servidor Express (API + arquivos estáticos)
│   ├── db.js              # camada de leitura/escrita do banco
│   ├── auth.js            # geração e verificação de JWT, middleware por papel
│   ├── seed.js             # dados de demonstração (escolas, turmas, trilha, usuários)
│   └── routes/
│       ├── auth.js         # POST /api/auth/login
│       ├── aluno.js        # GET/POST /api/aluno/*
│       ├── professor.js    # GET /api/professor/*
│       └── gestao.js       # GET /api/gestao/*
└── public/                 # front-end (HTML + CSS + JS puro, sem build step)
    ├── index.html           # login
    ├── aluno.html + js/aluno.js
    ├── professor.html + js/professor.js
    └── gestao.html + js/gestao.js
```

**Por que arquivo JSON e não um banco de verdade?** Para que o projeto rode em
qualquer máquina com `npm install` sem precisar de compilador nativo (SQLite
nativo, Postgres instalado, etc.). Toda a lógica de negócio fica isolada nas
rotas (`src/routes/*.js`) — trocar `db.js` por um driver Postgres/MySQL no
futuro não exige reescrever regras, só a camada de persistência.

**Por que front-end sem framework?** Para entregar algo que qualquer pessoa
consiga rodar e mexer sem etapa de build (Vite/webpack). Para uma versão de
produção com mais telas, migrar `public/` para React é o passo natural (ver
roadmap abaixo).

## Roadmap para produção (próximos passos reais)

1. **Conteúdo pedagógico**: hoje há 1 trilha com 7 missões de exemplo. Mapear
   os objetos de conhecimento da BNCC Computação para 6º–9º ano e transformar
   cada um em missão real, com um professor de Computação/Matemática validando.
2. **Editor de blocos completo**: o desafio atual é "ordenar blocos" (sequenciamento).
   Para exercícios mais ricos (loops aninhados, variáveis múltiplas), integrar
   um motor de blocos como o [Blockly](https://developers.google.com/blockly)
   (open-source, mesma lógica usada por Scratch/App Inventor).
3. **Banco de dados real**: migrar `data/db.json` para PostgreSQL (Render,
   Supabase ou servidor da própria Prefeitura) para suportar uso concorrente
   por múltiplas escolas.
4. **Cadastro em massa**: hoje os usuários são criados via `seed.js`; a versão
   real precisa de importação de estudantes/turmas por planilha (a Secretaria
   já deve ter essa base no sistema de matrículas).
5. **Infraestrutura para conexão instável**: o edital cita heterogeneidade de
   infraestrutura entre escolas — vale avaliar um modo offline-first (Service
   Worker / sincronização posterior) para escolas com internet instável.
6. **Deploy**: qualquer serviço que rode Node.js (Render, Railway, ou um
   servidor da própria Prefeitura). O front-end já é servido pelo mesmo
   processo do backend, não precisa de hospedagem separada.
7. **Piloto controlado**: validar com 1 turma e 1 professor reais antes de
   expandir para as demais escolas da rede, conforme pede o próprio edital
   ("desenvolvimento e validação").

## Dados de demonstração

O `seed.js` cria 3 escolas, 3 turmas, 5 estudantes (com progresso variado —
incluindo um estudante propositalmente "em risco", sem atividade há 9 dias,
para mostrar o alerta do professor funcionando), 1 professor e 1 gestor. É só
para demonstração; não é dado real da rede de Paudalho.
