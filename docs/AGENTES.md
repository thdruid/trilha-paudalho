# Agentes de desenvolvimento e qualidade

Os agentes em `.github/agents/` são instruções para assistentes de desenvolvimento, não são robôs que agem dentro da plataforma nem têm acesso a dados de estudantes.

| Agente | Quando usar | Limite principal |
|---|---|---|
| `designer-ux-paudalho` | revisar tela, acessibilidade e responsividade | não altera regras de negócio |
| `quality-release` | preparar teste, entrega ou demonstração | não publica nem altera dados sem ordem explícita |
| `pedagogical-content` | revisar missões, textos e progressão 6º–9º | não declara validação curricular formal |
| `security-data` | revisar autorização, dados e segredos | não toca produção nem expõe credenciais |

Essa divisão permite automação responsável do desenvolvimento: cada agente tem escopo, limites e checklist verificável. Para agentes de IA dentro do produto, seria necessário definir finalidade, provedor, dados permitidos, supervisão humana, custos e aprovação institucional antes de implementação.
