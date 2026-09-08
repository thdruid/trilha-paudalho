# Operação, deploy e manutenção

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `NODE_ENV=production` | ativa exigência de JWT forte |
| `PORT` | porta local; no Render é fornecida pela plataforma |
| `JWT_SECRET` | segredo com pelo menos 32 caracteres em produção |
| `DATABASE_URL` | conexão PostgreSQL/Supabase do servidor |
| `DB_DRIVER=json` | força modo JSON, apenas desenvolvimento/testes |
| `PILOT_ALUNO_PASSWORD`, `PILOT_PROFESSOR_PASSWORD`, `PILOT_GESTOR_PASSWORD` | usadas uma única vez pelo script de redefinição de piloto |

`.env` é local e está no `.gitignore`.

## Supabase

1. Crie o projeto e obtenha a URI PostgreSQL para o servidor.
2. Configure `DATABASE_URL` e `JWT_SECRET` localmente.
3. Execute `npm.cmd run migrate:postgres`.
4. Em banco vazio, execute `npm.cmd run seed:postgres` para inserir somente dados fictícios.
5. Defina senhas das contas de piloto com `npm.cmd run reset:pilot-passwords`.

As tabelas expostas têm RLS ativado e os papéis `anon` e `authenticated` não recebem acesso direto. Não use a chave de serviço do Supabase no front-end.

## Render

| Campo | Valor |
|---|---|
| Runtime | Node |
| Build command | `npm ci` |
| Start command | `npm start` |
| Health check | `/api/health` |

Configure no painel do Render, nunca no Git: `NODE_ENV`, `JWT_SECRET` e `DATABASE_URL`.

Após publicar uma mudança com banco, execute a migração em ambiente com `DATABASE_URL` configurada. Confirme `GET /api/health` retornando `{"ok":true,"database":"ok"}` antes da apresentação.

## Atualização do PWA

O service worker possui uma versão de cache em `public/sw.js`. Mudanças de interface devem atualizar essa versão para que aplicativos já instalados baixem os arquivos novos. O cache não armazena respostas da API autenticada.

## Rotina de verificação

```powershell
npm.cmd test
git diff --check
git status --short
```

Teste manualmente login, uma missão, feedback privado, troca de turma do professor, indicadores e exportação CSV.

## Recuperação

- Em JSON local, `npm.cmd run seed` recria somente os dados fictícios.
- Em PostgreSQL, faça backup antes de alterações de conteúdo ou dados reais.
- Não use seed de demonstração em produção com estudantes reais.
