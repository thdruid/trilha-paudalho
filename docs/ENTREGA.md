# Checklist de entrega e piloto

## O que a solução demonstra

| Objetivo esperado | Evidência na plataforma |
|---|---|
| Motivação e engajamento | trilha, XP, níveis, conquistas, missões e cenários visuais |
| Algoritmos e programação | sequência, repetição, condição, variáveis, funções, depuração e projeto |
| Aprendizagem por desafios | missões sequenciais, laboratório visual e editor guiado |
| Evolução dos estudantes | progresso, última atividade, XP e feedback individual |
| Apoio docente | recursos, visão de turma, alerta de inatividade e feedback privado |
| Decisão baseada em evidências | KPIs, dados por escola/série e relatório CSV |

## Demonstração de 10 minutos

1. Entre como estudante e apresente a trilha, a aba Aprender e uma missão.
2. Mostre XP/conquista após uma resposta correta.
3. Abra Projetos e explique que o rascunho atual é local ao aparelho.
4. Entre como professor, selecione a turma e envie um feedback para um estudante.
5. Volte ao estudante destinatário e confirme que o feedback aparece na aba própria.
6. Entre como gestão, mostre os indicadores e baixe o CSV.

## Critérios para considerar o piloto pronto

- [ ] `npm.cmd test` concluído sem falhas.
- [ ] `npm.cmd run migrate:postgres` executado no banco de piloto.
- [ ] Health check do ambiente público confirma banco disponível.
- [ ] Teste manual feito nos três papéis.
- [ ] Contas e dados exibidos são fictícios ou autorizados pela rede.
- [ ] Responsável pedagógico validou linguagem, sequência das missões e recursos.
- [ ] Responsável institucional definiu procedimento para dados reais, suporte e exclusão/retensão.

## Limites atuais, apresentados com transparência

- Projetos são rascunhos locais; ainda não são entregas compartilhadas para o professor.
- Relatório é CSV de indicadores agregados, não um relatório individual nominal para gestão.
- Não há cadastro em massa, recuperação de senha, notificações ou hackathon multiusuário.
- O conteúdo é protótipo e precisa de validação pedagógica formal antes de adoção curricular.

## Próxima fase recomendada

1. Validar o conteúdo em uma turma piloto com professor da rede.
2. Persistir projetos e permitir entrega/revisão pelo professor.
3. Criar cadastro seguro de turmas/estudantes e recuperação de senha.
4. Planejar ralis de programação/hackathons com regras, equipes, mediação e critérios de avaliação.
5. Migrar JWT para cookies `HttpOnly` antes de uso institucional em escala.
