# Arquitetura e API

## Visão geral

O servidor Express entrega os arquivos de `public/` e a API em `/api`. O navegador não conversa diretamente com Supabase: todo acesso passa pelo servidor com JWT e regras de autorização.

```text
Navegador/PWA → Express + JWT → camada de dados → PostgreSQL/Supabase
                                      └→ JSON local (desenvolvimento/testes)
```

## Módulos

| Área | Arquivos | Responsabilidade |
|---|---|---|
| Servidor | `src/server.js` | Express, arquivos estáticos, cabeçalhos e health check |
| Autenticação | `src/auth.js`, `src/routes/auth.js` | JWT, papéis e limite de tentativas de login |
| Estudante | `src/routes/aluno.js` | perfil, trilha, missões, XP, conquistas e feedbacks recebidos |
| Professor | `src/routes/professor.js` | turmas autorizadas, acompanhamento e envio de feedback |
| Gestão | `src/routes/gestao.js` | indicadores agregados |
| Dados | `src/db*.js`, `src/migrate-postgres.js` | adaptadores JSON/PostgreSQL e esquema |

## Papéis e autorização

| Papel | Pode acessar |
|---|---|
| `aluno` | dados próprios, missões próprias, conquistas e feedbacks destinados a ele |
| `professor` | suas turmas, seus estudantes e envio de feedback a estudantes dessas turmas |
| `gestor` | indicadores agregados de rede |

O identificador de turma recebido na URL é comparado com `turmas_ids` do professor. O destinatário de um feedback é validado como estudante da turma informada. `GET /api/aluno/feedbacks` filtra sempre pelo aluno contido no JWT.

## Endpoints principais

| Método | Rota | Papel | Uso |
|---|---|---|---|
| POST | `/api/auth/login` | público | cria sessão JWT, sujeito a rate limit |
| GET | `/api/health` | público | verifica servidor e banco quando PostgreSQL está ativo |
| GET | `/api/aluno/me` | aluno | perfil, XP, nível e streak |
| GET/POST | `/api/aluno/missao/:id` | aluno | lê missão e registra tentativa |
| GET | `/api/aluno/feedbacks` | aluno | feedbacks exclusivamente do destinatário |
| GET | `/api/professor/turma/:id/estudantes` | professor | acompanhamento de turma autorizada |
| POST | `/api/professor/turma/:turmaId/estudante/:alunoId/feedback` | professor | cria feedback privado |
| GET | `/api/gestao/kpis`, `/escolas`, `/series` | gestor | indicadores agregados |

## Dados e missões

As tabelas principais são `escolas`, `turmas`, `usuarios`, `trilhas`, `missoes`, `progresso`, `conquistas`, `usuario_conquistas`, `ultimo_acesso`, `streak` e `feedbacks`.

O front-end escolhe a experiência pelo campo `ordem` da missão, não pelo identificador técnico: ordens 1–3 usam cenários visuais e ordens 4–7 usam editor guiado. Para bases antigas, há fallback pelo título da missão.
