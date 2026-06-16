CONTEXTO ATUAL DO PROJETO POPOV:
Você já criou: /lib/supabase.ts, /hooks/useAuth.ts, ProtectedRoute, App.tsx com 
rotas, e os placeholders de Login, Signup, StudentDashboard, CounselorDashboard, 
AdminDashboard. O SQL completo foi gerado em SUPABASE_SETUP.sql. As tabelas de 
referência (riasec_factors, intelligences, interest_items com 47 itens, 
intelligence_items com 28 itens) já têm seeds inseridos.

ANTES DE IMPLEMENTAR, ME LISTE:
1. Quais arquivos NOVOS você vai criar?
2. Quais arquivos EXISTENTES você vai modificar?
3. Que dependências novas vai instalar?
Aguarde minha confirmação antes de executar.

TAREFA: Bloco 3 — Importação dos 3 xlsx grandes

Crie a página /admin/import como uma sub-rota do AdminDashboard existente.

ESTRUTURA:
- Crie o arquivo /src/app/pages/AdminImport.tsx
- Adicione rota nested no App.tsx: /admin/import deve renderizar AdminImport 
  dentro do guard ProtectedRoute com allowedRoles=['admin']
- Instale a dependência: npm install xlsx (npm: xlsx, é um parser de Excel)

LAYOUT DA PÁGINA AdminImport:
- Fundo #0F172A, padding p-8
- Título h1 "Importação de Bases" (text-3xl bold, branco)
- Subtítulo: "Importe os arquivos de referência uma única vez. Use upsert, então 
  pode re-importar sem erro."
- 3 cards verticais empilhados, cada um com:
  - Fundo #1E293B, padding p-6, rounded-xl, border #334155
  - Título do card (text-xl bold)
  - Descrição curta
  - Input file accept=".xlsx"
  - Botão "Importar" (verde-água #2BA88C, desabilitado se nenhum arquivo)
  - Área de log abaixo (fundo #0F172A, font-mono text-sm) que mostra progresso 
    e erros em tempo real

CARD 1 — "Importar profissões"
- Aceita arquivo profissoes_para_itens.xlsx
- Lê primeira sheet com a biblioteca xlsx
- Para cada linha:
  * Lê: mymentor, esco, onet, prof, item_1 até item_10
  * Calcula isco_4dig: pega esco como string, remove o ponto, pega os 4 
    primeiros caracteres
    Exemplos: esco "3141.2" → "3141"; esco "0110.11" → "0110"; 
    esco "1211.1.3" → "1211"
  * Faz upsert em occupations: { esco, isco_4dig, prof, mymentor, onet }
  * Para cada item_1..item_10 que NÃO seja nulo E seja MAIOR que 0, faz upsert 
    em occupation_items: { esco, item_cod }
  * IGNORA valores 0 (são dados ruins na planilha original)
- Mostra progresso a cada 50 linhas: "X de Y profissões processadas"
- Ao final: "✓ N profissões importadas, M vínculos profissão-item criados"

CARD 2 — "Importar formações"
- Aceita arquivo formacoes_para_profissoes_matriz_29012026.xlsx
- Para cada linha:
  * Lê: name_search, QNQ, isco_cod_level4, cnaef
  * Calcula qnq_label aplicando este mapeamento (case-sensitive). Default 
    "Não especificado":
    "Nível 1" → "Ensino Fundamental I (1º–5º ano)"
    "Nível 2" → "Ensino Fundamental II (6º–9º ano)"
    "Nível 3" → "Ensino Médio incompleto"
    "Nível 4" → "Ensino Médio + Curso Técnico"
    "Nível 5" → "Curso Técnico Pós-Médio / Tecnólogo (curta duração)"
    "Nível 6" → "Graduação (Bacharelado, Licenciatura ou Tecnólogo)"
    "Nível 7" → "Pós-graduação (Especialização ou Mestrado)"
    "Formação especializada" → "Curso Livre / Formação Profissional"
    "Formação Especializada" → "Curso Livre / Formação Profissional"
    "Nível Certificado de Formação" → "Certificação Profissional"
    "Nível Certificado de Qualificações" → "Certificação de Qualificação"
    "n.e." → "Não especificado"
  * Calcula cnaef_n1: se cnaef nulo → null. Se cnaef = 90 → 90. 
    Senão → Math.floor(cnaef / 100). Ex: cnaef 481 → cnaef_n1 4.
  * Insert em trainings: { name_search, qnq_original: QNQ, qnq_label, cnaef, 
    cnaef_n1 }, retorna id gerado
  * Para isco_cod_level4 (string que pode ter múltiplos como "7316, 7132"): 
    split(','), trim de cada, e para cada não-vazio insere training_iscos: 
    { training_id, isco_4dig }
- Progresso a cada 200 linhas
- Ao final: "✓ N formações importadas, M vínculos formação-ISCO criados"

CARD 3 — "Importar áreas CNAEF"
- Aceita arquivo CNAEF_CAE_cod.xlsx
- IMPORTANTE: aplica substituição PT-BR ANTES de inserir. Use estes dicionários:

  Substituições Nível 1:
  "Educação" → "Educação"
  "Artes e humanidade" → "Artes e Humanidades"
  "Ciências Sociais, Comércio e Direito" → "Ciências Sociais, Negócios e Direito"
  "Ciências, Matemática e Informática" → "Ciências Exatas, Matemática e Computação"
  "Engenharia, Indústrias Transformadoras e Construção" → "Engenharia, Produção e Construção"
  "Agricultura" → "Agricultura e Recursos Naturais"
  "Saúde e Protecção Social" → "Saúde e Bem-estar Social"
  "Serviços" → "Serviços"
  "Desenvolvimento pessoal" → "Desenvolvimento Pessoal"

  Substituições Nível 2:
  "Programas Gerais" → "Programas Gerais"
  "Programas de Base" → "Programas de Base"
  "Alfabetização" → "Alfabetização"
  "Educação" → "Educação"
  "Formação de Professores / Formadores e Ciências da Educação" → "Formação de Professores e Ciências da Educação"
  "Artes" → "Artes"
  "Humanidades" → "Humanidades"
  "Ciências Sociais e do Comportamento" → "Ciências Sociais e Comportamentais"
  "Informação e Jornalismo" → "Comunicação e Jornalismo"
  "Ciências Empresariais" → "Administração e Negócios"
  "Direito" → "Direito"
  "Ciências da Vida" → "Ciências Biológicas"
  "Ciências Físicas" → "Ciências Físicas e Naturais"
  "Matemática e Estatística" → "Matemática e Estatística"
  "Informática" → "Computação e Informática"
  "Engenharia e Técnicas Afins" → "Engenharia e Áreas Técnicas"
  "Indústrias Transformadoras" → "Produção Industrial"
  "Arquitectura e Construção" → "Arquitetura e Construção"
  "Agricultura, Silvicultura e Pescas" → "Agricultura, Silvicultura e Pesca"
  "Ciências Veterinárias" → "Medicina Veterinária"
  "Saúde" → "Saúde"
  "Serviços Sociais" → "Serviço Social"
  "Serviços Pessoais" → "Serviços Pessoais"
  "Serviços de Transporte" → "Transporte e Logística"
  "Protecção do Ambiente" → "Meio Ambiente"
  "Serviços de Segurança" → "Segurança"
  "Desconhecido ou não Especificado" → "Não especificado"

- Se valor não bater nenhuma chave do dicionário, mantém o original
- Faz upsert em cnaef_areas: { cod, nivel_1, nivel_2 }
- Ao final: "✓ N áreas importadas com texto adaptado para português do Brasil"

REGRAS IMPORTANTES:
- Use upsert em todos os inserts (on conflict do update) para permitir 
  re-importação sem erro
- Trate erros sem quebrar a importação inteira: se uma linha falhar, registra 
  no log "⚠ Linha N falhou: <motivo>" e segue para a próxima
- Mostre contador em tempo real durante o processo
- Não modifique nada que já existe no projeto. Não toque no Landing, no 
  AdminDashboard atual (só adicione a nova rota), nem nas outras páginas.

NÃO faça nada além disso. NÃO crie um header novo com botão "Admin". NÃO 
modifique a Landing. NÃO refatore nenhum arquivo existente. Acesso ao 
/admin/import será via URL direto.