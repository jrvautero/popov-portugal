TAREFA: Bloco 5 — Dashboard do estudante

CONTEXTO ATUAL DO PROJETO POPOV:
Blocos 1-4 concluídos. Auth funcional, signup/login testados. Tabelas de referência populadas (47 itens de interesses, 28 de inteligências, 6 RIASEC, 7 inteligências, 460 profissões, 4500+ formações, 35 áreas CNAEF). RLS desabilitado para testes.

ANTES DE IMPLEMENTAR, ME LISTE:
1. Quais arquivos NOVOS você vai criar
2. Quais arquivos EXISTENTES você vai modificar
3. Que dependências novas vai instalar
Aguarde minha confirmação antes de executar.

OBJETIVO: substituir o placeholder de StudentDashboard por uma implementação funcional.

ROTA /app (já protegida por role='student' via ProtectedRoute)

LAYOUT GERAL
- Header fixo no topo (height ~64px), fundo #0F172A com border-bottom #334155:
  - Esquerda: logo "POPOV" em texto bold (text-2xl, branco)
  - Direita: nome do usuário (profiles.full_name) seguido de botão "Sair" que chama signOut do useAuth e redireciona para /
- Logo abaixo, área principal com 2 colunas (em desktop):
  - Coluna esquerda: 280px de largura, padding p-4, espaçamento gap-3 entre cards
  - Coluna direita: flex-1, padding p-8, max-width 4xl

ATENÇÃO: NÃO criar a barra de abas horizontais (Autoconhecimento/Planejamento/Oportunidades/Ação). Essa estrutura foi removida do projeto. O dashboard tem apenas a coluna lateral com sub-itens diretos.

COLUNA LATERAL (280px)
3 cards verticais empilhados. Cada card:
- Altura ~110px, fundo #1E293B, rounded-lg, padding p-4, cursor pointer
- Card ativo: border 2px verde-água #2BA88C e fundo um pouco mais claro #334155
- Card bloqueado: opacity 50% + ícone de cadeado (Lucide Lock) no canto superior direito + texto "Bloqueado" abaixo do título em text-xs cinza
- Conteúdo de cada card: ícone de linha simples Lucide (16px, cor texto secundário) + nome curto (text-base font-semibold, branco)

Os 3 cards (na ordem):

CARD 1 — "Sobre você"
- Ícone Lucide: Info
- Sempre desbloqueado
- Marcado como "visualizado" quando o usuário clica em "Continuar" no conteúdo dele

CARD 2 — "Faça sua avaliação"
- Ícone Lucide: ClipboardList
- Desbloqueado se "Sobre você" foi visualizado (use estado local persistido em localStorage com chave "popov_visited_intro_{user_id}", ou crie coluna profiles.intro_seen boolean default false e atualize quando o usuário clicar em "Continuar")
- Use a versão com localStorage para simplicidade nesta fase

CARD 3 — "Seus resultados"
- Ícone Lucide: BarChart3
- Desbloqueado se existe results para o usuário, verificado por:
  SELECT count(*) FROM results r
  JOIN assessment_sessions s ON s.id = r.session_id
  WHERE s.student_id = auth.uid()
- Esta query roda no carregamento do dashboard

COLUNA PRINCIPAL (área direita)
Conteúdo muda conforme card selecionado. Default ao entrar: "Sobre você".

CONTEÚDO DO CARD 1 — "Sobre você"
- Título h2: "Sobre você" (text-2xl bold, branco, mb-6)
- Três parágrafos (text-base, texto principal, line-height relaxado, mb-4 entre eles):

  "O POPOV é um programa de orientação que ajuda você a conhecer melhor seus interesses, habilidades e possíveis caminhos profissionais."

  "Você vai responder dois questionários: um sobre seus interesses e outro sobre suas habilidades. Não existem respostas certas ou erradas, apenas as que mais se parecem com você."

  "No final, você verá um relatório com áreas profissionais que combinam com seu perfil, profissões reais associadas e formações disponíveis para chegar lá."

- Botão "Continuar" (verde-água #2BA88C, mt-6)
- Ao clicar:
  1. Marca "popov_visited_intro_{user_id}" no localStorage
  2. Atualiza estado para desbloquear o Card 2
  3. Seleciona automaticamente o Card 2

CONTEÚDO DO CARD 2 — "Faça sua avaliação"
- Título h2: "Faça sua avaliação"
- Texto explicativo (mb-6):
  "A avaliação tem duas partes: a primeira sobre seus interesses (47 perguntas) e a segunda sobre suas habilidades (28 perguntas). Tempo total estimado: 25 a 40 minutos. Você pode pausar e retomar quando quiser."

- Carregar estado da sessão atual:
  SELECT id, status FROM assessment_sessions
  WHERE student_id = auth.uid() AND status = 'in_progress'
  ORDER BY started_at DESC LIMIT 1

- Renderização condicional:
  - Se existe sessão in_progress: card destacado com texto "Você já começou uma avaliação." e botão "Continuar avaliação" (verde-água) que leva para /app/questionario
  - Se não existe: botão "Iniciar avaliação" (verde-água) que leva para /app/questionario

CONTEÚDO DO CARD 3 — "Seus resultados"
- Título h2: "Seus resultados"
- Carregar última results:
  SELECT r.generated_at FROM results r
  JOIN assessment_sessions s ON s.id = r.session_id
  WHERE s.student_id = auth.uid()
  ORDER BY r.generated_at DESC LIMIT 1
- Se existe: card com texto "Sua última avaliação foi concluída em [data formatada DD/MM/AAAA]." e botão "Ver relatório completo" (verde-água) que leva para /app/resultados
- Se não existe (caso o usuário acesse manualmente): texto "Você ainda não completou sua avaliação."

REGRAS:
- Sem emojis em qualquer texto ou ícone
- Layout responsivo: em < 768px, a coluna lateral vira lista horizontal scrollável de cards menores no topo, e a área principal ocupa toda a largura abaixo
- Não criar a rota /app/questionario neste bloco. Os botões "Iniciar/Continuar avaliação" apontam para essa rota mas a página será criada no Bloco 6. Por enquanto, aceitar que o link leve a uma página em branco.
- Não modificar Landing, Login, Signup, AdminImport, AdminDashboard, CounselorDashboard
- Não modificar App.tsx (a rota /app já existe)
- Sem botão "Refazer avaliação" neste bloco