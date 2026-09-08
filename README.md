# Trilha Paudalho

Plataforma web gamificada para aprendizagem de Algoritmos e Programação e acompanhamento pedagógico nos anos finais do Ensino Fundamental. É uma solução demonstrável para a Rede Municipal de Paudalho/PE, composta por três ambientes integrados:

- **Estudante:** trilhas, missões, XP, conquistas, biblioteca de aprendizagem, projetos e feedbacks individuais.
- **Professor:** recursos pedagógicos, acompanhamento por turma, alertas de participação e feedback privado por estudante.
- **Gestão:** indicadores por escola e série, visualização de participação e exportação de relatório CSV.

## Estado da solução

O projeto é um **MVP funcional para piloto**. Login, autorização por papel, progresso, XP, desbloqueios, indicadores, feedbacks privados e persistência PostgreSQL estão implementados. A adoção com dados reais requer validação pedagógica, governança de dados e operação descritas em [docs/ENTREGA.md](docs/ENTREGA.md).

## Tecnologias

- Front-end: HTML, CSS e JavaScript puro, sem etapa de build.
- Back-end: Node.js e Express.
- Banco: PostgreSQL/Supabase em produção; JSON somente para desenvolvimento e testes locais.
- Autenticação: JWT com controle de papel.
- Aplicativo instalável: PWA com cache apenas da interface estática.

## Execução local

Pré-requisito: Node.js 18 ou superior.

```powershell
npm.cmd install
npm.cmd run seed
npm.cmd start
```

Abra `http://localhost:4000`. O seed é exclusivamente demonstrativo e recria `data/db.json`; não use com dados reais.

Para validar:

```powershell
npm.cmd test
```

## PostgreSQL/Supabase

Crie um arquivo `.env` a partir de `.env.example` e preencha `DATABASE_URL` e `JWT_SECRET`. Nunca versione o arquivo nem compartilhe sua URI.

```powershell
npm.cmd run migrate:postgres
npm.cmd run seed:postgres
```

Depois de uma atualização que inclua tabelas novas, execute novamente `npm.cmd run migrate:postgres`. A migração é idempotente. Para as contas de piloto, use `npm.cmd run reset:pilot-passwords` com as três variáveis `PILOT_*` definidas localmente.

## Documentação

- [Arquitetura e API](docs/ARQUITETURA.md)
- [Operação, deploy e manutenção](docs/OPERACAO.md)
- [Checklist de entrega e piloto](docs/ENTREGA.md)
- [Agentes de desenvolvimento e qualidade](docs/AGENTES.md)

## Segurança e privacidade

- Rotas exigem autenticação e papel correto.
- Professor só acessa estudantes vinculados às próprias turmas.
- Feedbacks são retornados somente ao aluno destinatário; nem outros alunos nem professores de outras turmas podem acessá-los.
- O banco PostgreSQL habilita RLS e revoga acesso direto dos papéis públicos do Supabase; o servidor é o único intermediário de dados.
- JWT permanece em `localStorage` neste MVP. Para produção institucional, migrar para cookie `HttpOnly`, `Secure`, `SameSite` e proteção CSRF.

## Licença e uso

Este repositório contém uma demonstração técnica e pedagógica. Conteúdo curricular, dados de estudantes, identidade visual institucional e regras de acesso devem ser aprovados pela rede responsável antes do uso em escala.
