TAREFA: Reescrever a página /app/questionario para uma UX nova.

OBJETIVO: substituir o layout de "7 perguntas por página" por uma experiência de uma pergunta por vez, com salto automático entre perguntas.

ANTES DE IMPLEMENTAR, ME LISTE:
1. Quais arquivos NOVOS você vai criar
2. Quais arquivos EXISTENTES você vai modificar
3. Que dependências novas vai instalar
Aguarde minha confirmação antes de executar.

NOVA LÓGICA DA PÁGINA /app/questionario

ESTRUTURA VISUAL
- A página inteira tem altura igual à viewport (100vh), sem scroll natural
- Apenas UMA pergunta visível por vez
- A pergunta atual fica centralizada verticalmente na tela (na altura dos olhos), centralizada horizontalmente
- Header fixo no topo (mesmo do Bloco 6 anterior): logo POPOV + barra de progresso "X de 75" + botão "Voltar para o painel"

LAYOUT DE CADA PERGUNTA
- Card centralizado, max-w-2xl, fundo #1E293B, padding p-10, rounded-xl
- Indicador acima do card: "Pergunta X de 47" (ou "Pergunta X de 28" na etapa 2), text-sm texto secundário, mb-4
- Texto da pergunta em destaque (text-xl, branco, mb-8, line-height relaxado)
- Linha horizontal com 5 botões da escala Likert (em mobile, vertical empilhado)
- Cada botão é um pill arredondado, padding px-6 py-3
- Estado normal: fundo #0F172A, border 1px #334155, texto secundário
- Estado hover: border verde-água, fundo #334155
- Estado selecionado: fundo verde-água #2BA88C com transparência 0.2, border 2px verde-água, texto branco

COMPORTAMENTO AO CLICAR EM UMA RESPOSTA
1. Salvar imediatamente (await supabase upsert em interest_answers ou intelligence_answers)
2. Atualizar barra de progresso global
3. Aguardar 250ms
4. Saltar automaticamente para a PRÓXIMA pergunta:
   - "Próxima" significa: a próxima pergunta na ordem que AINDA NÃO foi respondida
   - Se o usuário responder a pergunta 5 e a pergunta 6 já tem resposta (porque ele voltou e alterou a 5), o sistema deve pular a 6 e ir para a 7
   - Se todas as perguntas seguintes já têm resposta, ir para a primeira pergunta não respondida ANTES da atual
   - Se TODAS as perguntas estão respondidas, ir para a tela de transição (etapa 1→2) ou tela final (etapa 2)

ANIMAÇÃO DE TRANSIÇÃO
- Quando uma pergunta sai e a próxima entra: fade-out + slide-up suave (300ms total)
- Use Tailwind transitions ou framer-motion (instalar se necessário)

NAVEGAÇÃO MANUAL
- Indicadores no rodapé do card (logo abaixo dos botões da escala):
  - Botão "Voltar" (cinza, esquerda) — vai para a pergunta anterior na ordem (independente de estar respondida ou não), permite o usuário revisar e alterar respostas
  - Botão "Pular" (cinza, direita) — vai para a próxima pergunta na ordem, sem responder a atual

FINALIZAÇÃO DE CADA ETAPA
- Quando o usuário responder a 47ª pergunta da Etapa 1:
  - Verificar se TODAS as 47 perguntas têm resposta no banco
  - Se sim: mostrar tela intermediária (centralizada, fundo #1E293B, padding p-10, rounded-xl):
    - Título h2: "Você concluiu a primeira parte"
    - Texto: "Agora vamos avaliar suas habilidades. São 28 perguntas, em torno de 10 minutos."
    - Botão "Continuar" (verde-água) que inicia a Etapa 2 na pergunta 1
  - Se NÃO: identificar a primeira pergunta da Etapa 1 ainda não respondida e saltar até ela. Mostrar mensagem temporária no topo do card (toast ou banner amarelo): "Você pulou esta pergunta. Responda para continuar." (some após 3 segundos)

- Quando o usuário responder a 28ª pergunta da Etapa 2:
  - Verificar se todas as 28 da Etapa 2 estão respondidas
  - Se sim: mostrar tela de conclusão (mesma estrutura visual):
    - Título h2: "Você concluiu sua avaliação"
    - Texto: "Suas respostas foram salvas. Agora vamos calcular seus resultados."
    - Botão "Concluir e ver resultados" (verde-água, com ícone Check do Lucide)
    - Esse botão executa o fluxo de conclusão (mesmo do Bloco 6 anterior): UPDATE assessment_sessions status='completed', invoke calculate_results, redirect /app/resultados ou mensagem de erro se a Edge Function ainda não existir
  - Se NÃO: identificar a primeira pergunta da Etapa 2 ainda não respondida e saltar até ela. Banner amarelo: "Você pulou esta pergunta. Responda para continuar."

PERSISTÊNCIA E RETOMADA
- Auto-save em cada clique (mesmo padrão do Bloco 6 anterior)
- Ao retornar à página /app/questionario:
  - Buscar sessão in_progress
  - Carregar todas as respostas já dadas
  - Determinar em qual pergunta posicionar:
    - Se nenhuma resposta: mostrar tela de instrução da Etapa 1
    - Se respostas parciais na Etapa 1: ir para a primeira pergunta NÃO respondida da Etapa 1
    - Se Etapa 1 completa e Etapa 2 parcial: ir para a primeira pergunta NÃO respondida da Etapa 2
    - Se ambas completas: ir para a tela de conclusão

INSTRUÇÕES DAS ETAPAS (texto que aparece antes da pergunta 1 de cada etapa)

Tela de instrução Etapa 1:
- Centralizada, fundo #1E293B, padding p-10, rounded-xl
- Título h2: "Parte 1: Seus interesses"
- Texto: "Você verá 47 frases sobre atividades. Para cada uma, indique o quanto você gostaria de fazer aquela atividade. Não pense demais, sua primeira reação costuma ser a mais honesta."
- Botão "Começar" (verde-água) que inicia na pergunta 1 da Etapa 1

Escala Likert da Etapa 1:
- 1 = "Não gosto nada"
- 2 = "Gosto pouco"
- 3 = "Indiferente"
- 4 = "Gosto"
- 5 = "Gosto muito"

Escala Likert da Etapa 2:
- 1 = "Nada como eu"
- 2 = "Pouco como eu"
- 3 = "Mais ou menos"
- 4 = "Bastante como eu"
- 5 = "Totalmente como eu"

REGRAS:
- Sem emojis em qualquer texto ou ícone
- Layout responsivo (mobile + desktop)
- A pergunta SEMPRE centralizada verticalmente, independente da altura da tela
- Não modificar nenhuma outra página do projeto
- Não modificar App.tsx (a rota /app/questionario já existe do Bloco 6)
- Reescrever apenas o conteúdo de Questionario.tsx

ORDEM DE PRIORIDADE em caso de dúvida ou ambiguidade durante a implementação: PARE E ME PERGUNTE. Não tome decisões sozinho. Não invente comportamentos não especificados aqui.