TAREFA: Bloco 6 — Questionário (etapa 1 e 2)

CONTEXTO ATUAL DO PROJETO POPOV:
Blocos 1-5 concluídos. StudentDashboard funcional. Tabelas de referência populadas: interest_items (47 linhas), intelligence_items (28 linhas). Tabelas operacionais existem mas vazias: assessment_sessions, interest_answers, intelligence_answers. RLS desabilitado para testes.

ANTES DE IMPLEMENTAR, ME LISTE:
1. Quais arquivos NOVOS você vai criar
2. Quais arquivos EXISTENTES você vai modificar
3. Que dependências novas vai instalar
Aguarde minha confirmação antes de executar.

OBJETIVO: criar a rota /app/questionario que executa as duas etapas do teste (interesses e inteligências), salva respostas em tempo real, e ao final marca a sessão como completa.

ROTA /app/questionario (protegida, role='student')

FLUXO INICIAL (no carregamento)
1. Buscar sessão atual:
   const { data: sessions } = await supabase
     .from('assessment_sessions')
     .select('*')
     .eq('student_id', userId)
     .eq('status', 'in_progress')
     .order('started_at', { ascending: false })
     .limit(1);

2. Se não existe nenhuma in_progress, criar nova:
   await supabase.from('assessment_sessions').insert({ student_id: userId }).select().single();

3. Guardar session_id em estado local

4. Carregar respostas já dadas (caso retomada):
   const { data: intAns } = await supabase.from('interest_answers').select('item_cod, answer').eq('session_id', sessionId);
   const { data: intelAns } = await supabase.from('intelligence_answers').select('item_ordem, answer').eq('session_id', sessionId);

5. Determinar etapa e página atual com base no número de respostas:
   - Se intAns.length < 47: etapa 1, página = Math.floor(intAns.length / 7) + 1
   - Se intAns.length === 47 e intelAns.length < 28: etapa 2, página = Math.floor(intelAns.length / 7) + 1
   - Se intAns.length === 47 e intelAns.length === 28: tela de conclusão

6. Carregar itens das tabelas de referência:
   const { data: items1 } = await supabase.from('interest_items').select('*').order('cod', { ascending: true });
   const { data: items2 } = await supabase.from('intelligence_items').select('*').order('ordem_nova', { ascending: true });

LAYOUT GERAL
- Header fixo no topo (height ~80px), fundo #0F172A, border-bottom #334155:
  - Esquerda: logo "POPOV" (text-xl bold)
  - Centro: barra de progresso global
    - Width 60% do header, height 8px, fundo #334155, rounded-full
    - Barra interna verde-água #2BA88C, width proporcional ao total respondido / 75
    - Texto abaixo da barra: "X de 75 respondidas" (text-xs, texto secundário)
  - Direita: botão "Voltar para o painel"
    - Se houver pelo menos 1 resposta dada na sessão atual, mostrar modal de confirmação:
      Título: "Sair da avaliação?"
      Texto: "Suas respostas estão salvas. Você pode retomar de onde parou a qualquer momento."
      Botões: "Cancelar" / "Sim, voltar" (que leva para /app)

- Área principal: max-w-3xl centralizada, padding p-8, fundo #0F172A

TELA DE INSTRUÇÃO DA ETAPA 1 (mostrada antes da primeira pergunta)
- Centralizada, fundo #1E293B, padding p-10, rounded-xl
- Título h2: "Parte 1: Seus interesses" (text-2xl bold)
- Texto explicativo (mb-6):
  "Você verá 47 frases sobre atividades. Para cada uma, indique o quanto você gostaria de fazer aquela atividade. Não pense demais, sua primeira reação costuma ser a mais honesta."
- Botão "Começar" (verde-água, full width)

PÁGINAS DA ETAPA 1 (7 páginas, 7 itens por página, exceto última com 5)
- Indicador no topo: "Pergunta X a Y de 47" (text-sm texto secundário)
- Para cada item da página, um card:
  - Fundo #1E293B, padding p-6, rounded-xl, mb-4
  - Texto da pergunta em destaque (text-base, branco, mb-4)
  - Linha horizontal com 5 botões radio (escala Likert):
    - 1 = "Não gosto nada"
    - 2 = "Gosto pouco"
    - 3 = "Indiferente"
    - 4 = "Gosto"
    - 5 = "Gosto muito"
  - Cada botão é um pill arredondado, padding px-4 py-2, com hover sutil
  - Botão não selecionado: fundo #0F172A, border 1px #334155, texto secundário
  - Botão selecionado: fundo verde-água #2BA88C com transparência (rgba 43,168,140,0.2), border 2px verde-água, texto branco

- Comportamento ao clicar em uma resposta:
  await supabase.from('interest_answers').upsert({ session_id, item_cod, answer });
  Atualizar estado local imediatamente (sem aguardar resposta da rede para visual)
  Atualizar contagem da barra de progresso

- Rodapé fixo da página (sticky bottom, fundo #0F172A com blur, padding p-4):
  - Botão "Anterior" (cinza, esquerda) — desabilitado na primeira página da etapa 1
  - Texto centralizado: "Página X de 7"
  - Botão "Próximo" (verde-água, direita) — habilitado apenas quando todos os 7 itens da página atual têm resposta

TELA INTERMEDIÁRIA (mostrada após concluir a 7ª página da etapa 1)
- Centralizada, fundo #1E293B, padding p-10, rounded-xl
- Título h2: "Você concluiu a primeira parte" (text-2xl bold)
- Texto:
  "Agora vamos avaliar suas habilidades. São 28 perguntas, em torno de 10 minutos."
- Botão "Continuar" (verde-água)

PÁGINAS DA ETAPA 2 (4 páginas, 7 itens por página)
- Estrutura idêntica à etapa 1
- Indicador: "Pergunta X a Y de 28"
- Escala Likert da etapa 2 (textos diferentes):
  - 1 = "Nada como eu"
  - 2 = "Pouco como eu"
  - 3 = "Mais ou menos"
  - 4 = "Bastante como eu"
  - 5 = "Totalmente como eu"

- Comportamento ao clicar:
  await supabase.from('intelligence_answers').upsert({ session_id, item_ordem, answer });

- Na 4ª página, quando todos os 7 itens estão respondidos, o botão "Próximo" se transforma em "Concluir e ver resultados" (verde-água, com ícone Check do Lucide à esquerda do texto)

CONCLUSÃO
Ao clicar em "Concluir e ver resultados":
1. Atualizar sessão:
   await supabase.from('assessment_sessions')
     .update({ status: 'completed', completed_at: new Date().toISOString() })
     .eq('id', session_id);

2. Mostrar tela de loading com spinner e texto "Estamos calculando seus resultados..." (centralizado, fundo #0F172A, fullscreen)

3. Chamar a Edge Function calculate_results:
   const { data, error } = await supabase.functions.invoke('calculate_results', {
     body: { session_id }
   });

4. Se sucesso (data.ok === true), redirecionar para /app/resultados
5. Se erro, mostrar mensagem amigável e botão "Tentar novamente" que repete a chamada
6. NOTA: a Edge Function calculate_results AINDA NÃO EXISTE neste momento (será criada no Bloco 7). Por enquanto, o invoke vai falhar. Implemente a chamada normalmente e na falha exiba: "Função de cálculo ainda não disponível. Será implementada no próximo bloco." com botão "Voltar para o painel" que leva a /app.

REGRAS:
- Sem emojis em texto ou ícones
- Auto-save: cada clique em uma resposta faz upsert imediato. Se o usuário fechar a aba e voltar, retoma exatamente de onde parou.
- Permitir voltar para páginas anteriores e mudar respostas (a barra de progresso reflete o total respondido, não o "mais à frente já respondido")
- Layout responsivo: em mobile, os 5 botões da escala podem virar layout vertical empilhado se a largura não comportar horizontal
- Não modificar nenhuma página existente (Landing, Login, Signup, StudentDashboard, AdminImport, etc.)
- Adicionar a rota /app/questionario no App.tsx, dentro do guard ProtectedRoute com allowedRoles=['student']