# POPOV — Especificação para Figma Make

Programa de Orientação Profissional e Orientação Vocacional.
Documento técnico de implementação. Stack: Figma Make + Supabase.
Versão totalmente adaptada para português do Brasil.

---

## 1. Auditoria das bases de dados fornecidas

### 1.1 `itens_questionario_interesses.xlsx`

47 itens válidos (linhas com `cod` + `item` + `fator` preenchidos). As outras 152 linhas estão vazias e devem ser ignoradas na importação.

| Fator | RIASEC (Holland) | Nº itens |
|---|---|---|
| 1 | Realista | 10 |
| 2 | Investigativo | 7 |
| 3 | Artístico | 7 |
| 4 | Social | 9 |
| 5 | Empreendedor | 7 |
| 6 | Convencional | 7 |

A planilha original está em PT-PT. Os textos finais adaptados estão na seção 5.

### 1.2 `profissoes_para_itens.xlsx`

460 profissões. Cada profissão associada a 1 a 10 itens do questionário (média 4,6). Colunas relevantes:

- `prof` — nome da profissão (alguns textos contêm termos PT-PT como "telemóvel", "gerir", "elétrónica" — recomenda-se aplicar substituições no momento da importação ou em runtime via dicionário)
- `esco` — código ESCO/CPP (formato "0110.11")
- `onet` — código O*NET-SOC (não usaremos)
- `item_1` a `item_10` — referências aos códigos do questionário

Atenção: alguns registros têm `item_X = 0`, valor inválido (a numeração começa em 1). Tratar como nulo.

### 1.3 `formacoes_para_profissoes_matriz_29012026.xlsx`

4 526 formações. Colunas relevantes:

- `name_search` — nome da formação
- `QNQ` — nível QNQ (sistema português; equivalência brasileira na tabela abaixo)
- `isco_cod_level4` — código ISCO-08 de 4 dígitos (pode conter múltiplos separados por vírgula)
- `cnaef` — código da área de formação

**Equivalência QNQ → terminologia educacional brasileira (para exibição):**

| QNQ original | Exibir no relatório |
|---|---|
| Nível 1 | Ensino Fundamental I (1º–5º ano) |
| Nível 2 | Ensino Fundamental II (6º–9º ano) |
| Nível 3 | Ensino Médio incompleto |
| Nível 4 | Ensino Médio + Curso Técnico |
| Nível 5 | Curso Técnico Pós-Médio / Tecnólogo (curta duração) |
| Nível 6 | Graduação (Bacharelado, Licenciatura ou Tecnólogo) |
| Nível 7 | Pós-graduação (Especialização ou Mestrado) |
| Formação especializada | Curso Livre / Formação Profissional |
| Formação Especializada | Curso Livre / Formação Profissional |
| Nível Certificado de Formação | Certificação Profissional |
| Nível Certificado de Qualificações | Certificação de Qualificação |
| n.e. | Não especificado |

Cobertura: 2 228 linhas têm `isco_cod_level4` preenchido, 2 546 têm `cnaef`, 1 206 têm os dois.

### 1.4 `CNAEF_CAE_cod.xlsx` — adaptado para PT-BR

35 linhas. Toda a árvore CNAEF adaptada ortograficamente.

**Nível 1 — 9 áreas macro:**

| cod | Nome PT-PT (original) | Nome PT-BR (gravar no banco e exibir) |
|---|---|---|
| 0 | Educação | Educação |
| 2 | Artes e humanidade | Artes e Humanidades |
| 3 | Ciências Sociais, Comércio e Direito | Ciências Sociais, Negócios e Direito |
| 4 | Ciências, Matemática e Informática | Ciências Exatas, Matemática e Computação |
| 5 | Engenharia, Indústrias Transformadoras e Construção | Engenharia, Produção e Construção |
| 6 | Agricultura | Agricultura e Recursos Naturais |
| 7 | Saúde e Protecção Social | Saúde e Bem-estar Social |
| 8 | Serviços | Serviços |
| 90 | Desenvolvimento pessoal | Desenvolvimento Pessoal |

**Nível 2 — subáreas:**

| cod | Nome PT-PT (original) | Nome PT-BR |
|---|---|---|
| 10 | Programas Gerais | Programas Gerais |
| 80 | Programas de Base | Programas de Base |
| 90 | Alfabetização | Alfabetização |
| 100 | Educação | Educação |
| 140 | Formação de Professores / Formadores e Ciências da Educação | Formação de Professores e Ciências da Educação |
| 210 | Artes | Artes |
| 220 | Humanidades | Humanidades |
| 310 | Ciências Sociais e do Comportamento | Ciências Sociais e Comportamentais |
| 320 | Informação e Jornalismo | Comunicação e Jornalismo |
| 340 | Ciências Empresariais | Administração e Negócios |
| 380 | Direito | Direito |
| 420 | Ciências da Vida | Ciências Biológicas |
| 440 | Ciências Físicas | Ciências Físicas e Naturais |
| 460 | Matemática e Estatística | Matemática e Estatística |
| 480 | Informática | Computação e Informática |
| 520 | Engenharia e Técnicas Afins | Engenharia e Áreas Técnicas |
| 540 | Indústrias Transformadoras | Produção Industrial |
| 580 | Arquitectura e Construção | Arquitetura e Construção |
| 620 | Agricultura, Silvicultura e Pescas | Agricultura, Silvicultura e Pesca |
| 640 | Ciências Veterinárias | Medicina Veterinária |
| 720 | Saúde | Saúde |
| 760 | Serviços Sociais | Serviço Social |
| 810 | Serviços Pessoais | Serviços Pessoais |
| 840 | Serviços de Transporte | Transporte e Logística |
| 850 | Protecção do Ambiente | Meio Ambiente |
| 860 | Serviços de Segurança | Segurança |
| 90 (sub) | Desconhecido ou não Especificado | Não especificado |

Importante: armazenar o **texto adaptado PT-BR já no banco** durante a importação. Não fazer substituição em runtime — gera bug futuro.

### 1.5 `inteligencias.xlsx`

28 itens, 7 inteligências (Gardner), 4 itens cada.

| Código | Inteligência (Gardner) — PT-BR |
|---|---|
| 1 | Linguística |
| 2 | Lógico-matemática |
| 3 | Espacial |
| 4 | Corporal-cinestésica |
| 5 | Musical |
| 6 | Interpessoal |
| 7 | Intrapessoal |

O relatório vai exibir **3 mais fortes + 3 mais fracas** (ignora a do meio do ranking de 7).

### 1.6 Ligação entre profissões e formações — descoberta crítica

Os formatos de código profissional eram inicialmente incompatíveis:
- `profissoes_para_itens.onet` → formato O*NET-SOC ("19-4021")
- `formacoes_para_profissoes_matriz.isco_cod_level4` → formato ISCO-08 ("3141")

**A ligação correta é:** primeiros 4 caracteres do campo `esco` em profissões, removendo o ponto.

```
esco "3141.2" → isco_4dig "3141"
match com formacoes.isco_cod_level4 = "3141"
```

Cobertura: 302 de 330 códigos ISCO únicos do lado das profissões encontram correspondência (≈91%).

### 1.7 O que NÃO está nas bases (decisão sobre v1)

1. **Texto narrativo do orientador** — confirmado: gerado por IA na próxima etapa.
2. **Texto narrativo da página "Caminhos formativos"** — pode usar template fixo, sem IA.
3. **"Profissões do futuro"** — não está nas bases. Sugestão: ficar fora da v1.
4. **Descrições textuais ricas das áreas CNAEF** — não está nas bases. V1 usa template fixo curto.
5. **Vagas de emprego** — fase 2.

### 1.8 Cobertura geral do MVP

O que você enviou cobre o pipeline completo (questionário → perfil → profissões → formações → áreas CNAEF). O sistema funciona end-to-end.

---

## 2. Modelo de dados (Supabase)

### 2.1 Tabelas de referência

```sql
-- Itens do questionário de interesses (47 itens, 6 fatores RIASEC)
create table interest_items (
  cod          int primary key,
  item_text    text not null,                 -- já adaptado PT-BR
  fator        int not null check (fator between 1 and 6)
);
create index idx_interest_items_fator on interest_items(fator);

-- Itens do questionário de inteligências múltiplas (28 itens, 7 inteligências)
create table intelligence_items (
  ordem_nova        int primary key,
  item_text         text not null,             -- já adaptado PT-BR
  inteligencia_cod  int not null check (inteligencia_cod between 1 and 7)
);
create index idx_intelligence_items_int on intelligence_items(inteligencia_cod);

-- Lookup RIASEC
create table riasec_factors (
  cod          int primary key,
  nome         text not null,
  descricao    text
);

-- Lookup Inteligências
create table intelligences (
  cod          int primary key,
  nome         text not null,
  descricao    text
);

-- 460 profissões
create table occupations (
  esco          text primary key,
  isco_4dig     text not null,
  prof          text not null,
  mymentor      text,
  onet          text
);
create index idx_occupations_isco on occupations(isco_4dig);

-- Tabela ponte: profissão -> itens
create table occupation_items (
  esco          text references occupations(esco) on delete cascade,
  item_cod      int references interest_items(cod) on delete cascade,
  primary key (esco, item_cod)
);

-- 4526 formações
create table trainings (
  id            bigserial primary key,
  name_search   text not null,
  qnq_original  text,                          -- valor original do xlsx
  qnq_label     text,                          -- equivalência PT-BR
  cnaef         int,
  cnaef_n1      int                            -- primeiro dígito da cnaef
);
create index idx_trainings_cnaef on trainings(cnaef);
create index idx_trainings_cnaef_n1 on trainings(cnaef_n1);

-- Tabela ponte: formação -> ISCO (uma formação pode ter vários ISCO codes)
create table training_iscos (
  training_id   bigint references trainings(id) on delete cascade,
  isco_4dig     text not null,
  primary key (training_id, isco_4dig)
);
create index idx_training_iscos_isco on training_iscos(isco_4dig);

-- Áreas CNAEF (textos PT-BR já gravados na importação)
create table cnaef_areas (
  cod         int primary key,
  nivel_1     text,
  nivel_2     text,
  is_n1       boolean generated always as (nivel_2 is null or trim(nivel_2) = '') stored
);
create index idx_cnaef_n1 on cnaef_areas(is_n1);
```

### 2.2 Seeds das tabelas de lookup (PT-BR)

```sql
insert into riasec_factors (cod, nome, descricao) values
  (1, 'Realista',      'Você se identifica com atividades práticas, manuais e ao ar livre. Prefere trabalhar com objetos, máquinas, plantas ou animais a lidar com ideias abstratas.'),
  (2, 'Investigativo', 'Você gosta de pensar, analisar e investigar. Tem curiosidade por dados, ciência, e prefere problemas que exigem raciocínio.'),
  (3, 'Artístico',     'Você se expressa através da criação. Gosta de ambientes que valorizam originalidade, estética e liberdade criativa.'),
  (4, 'Social',        'Você se realiza ajudando, ensinando ou cuidando de outras pessoas. Tem facilidade para se conectar e prefere ambientes colaborativos.'),
  (5, 'Empreendedor',  'Você gosta de liderar, persuadir e gerenciar. Sente-se motivado por desafios, metas e pela possibilidade de influenciar resultados.'),
  (6, 'Convencional',  'Você prefere ambientes organizados, com regras claras. Tem facilidade para lidar com dados, rotinas e tarefas estruturadas.');

insert into intelligences (cod, nome, descricao) values
  (1, 'Linguística',          'Capacidade de usar palavras com clareza, expressar ideias por escrito e oralmente, contar histórias e argumentar.'),
  (2, 'Lógico-matemática',    'Capacidade de raciocinar com números, resolver problemas, identificar padrões e trabalhar com lógica.'),
  (3, 'Espacial',             'Capacidade de visualizar imagens mentais, entender espaços e relações entre objetos, interpretar mapas e diagramas.'),
  (4, 'Corporal-cinestésica', 'Capacidade de usar o corpo com habilidade e controle, coordenar movimentos e expressar-se fisicamente.'),
  (5, 'Musical',              'Sensibilidade para sons, ritmos e melodias; capacidade de reproduzir, criar ou apreciar música.'),
  (6, 'Interpessoal',         'Capacidade de entender outras pessoas, lidar com emoções alheias, trabalhar em equipe e influenciar grupos.'),
  (7, 'Intrapessoal',         'Autoconhecimento, capacidade de refletir sobre si mesmo, identificar emoções próprias e tomar decisões alinhadas a valores pessoais.');
```

### 2.3 Tabelas operacionais

```sql
create type user_role as enum ('student','counselor','admin');

create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          user_role not null default 'student',
  full_name     text,
  email         text,
  created_at    timestamptz default now()
);

create table schools (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  city          text,
  state         text,                          -- UF
  active        boolean default true,
  created_at    timestamptz default now()
);

create table counselor_schools (
  counselor_id  uuid references profiles(id) on delete cascade,
  school_id     uuid references schools(id) on delete cascade,
  primary key (counselor_id, school_id)
);

create table student_schools (
  student_id    uuid references profiles(id) on delete cascade primary key,
  school_id     uuid references schools(id),
  grade         text,                          -- "9º ano EF", "1ª série EM" etc.
  class_name    text,
  joined_at     timestamptz default now()
);

create type session_status as enum ('in_progress','completed','abandoned');

create table assessment_sessions (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references profiles(id) on delete cascade,
  status          session_status not null default 'in_progress',
  started_at      timestamptz default now(),
  completed_at    timestamptz
);

create table interest_answers (
  session_id    uuid references assessment_sessions(id) on delete cascade,
  item_cod      int references interest_items(cod),
  answer        int not null check (answer between 1 and 5),
  primary key (session_id, item_cod)
);

create table intelligence_answers (
  session_id      uuid references assessment_sessions(id) on delete cascade,
  item_ordem      int references intelligence_items(ordem_nova),
  answer          int not null check (answer between 1 and 5),
  primary key (session_id, item_ordem)
);

create table results (
  session_id          uuid primary key references assessment_sessions(id) on delete cascade,
  riasec_scores       jsonb not null,
  intel_scores        jsonb not null,
  top_strengths       jsonb not null,
  top_challenges      jsonb not null,
  occupation_scores   jsonb not null,
  cnaef_n1_scores     jsonb not null,
  cnaef_detailed      jsonb not null,
  top3_areas          jsonb not null,
  generated_at        timestamptz default now()
);
```

### 2.4 Row Level Security (RLS)

```sql
alter table profiles              enable row level security;
alter table assessment_sessions   enable row level security;
alter table interest_answers      enable row level security;
alter table intelligence_answers  enable row level security;
alter table results               enable row level security;
alter table student_schools       enable row level security;

create policy student_own_session on assessment_sessions
  for all using (student_id = auth.uid());

create policy student_own_results on results
  for select using (
    exists (select 1 from assessment_sessions s
            where s.id = results.session_id and s.student_id = auth.uid())
  );

create policy student_own_int_answers on interest_answers
  for all using (
    exists (select 1 from assessment_sessions s
            where s.id = interest_answers.session_id and s.student_id = auth.uid())
  );

create policy student_own_intel_answers on intelligence_answers
  for all using (
    exists (select 1 from assessment_sessions s
            where s.id = intelligence_answers.session_id and s.student_id = auth.uid())
  );

create policy counselor_view_students on profiles
  for select using (
    exists (
      select 1 from student_schools ss
      join counselor_schools cs on cs.school_id = ss.school_id
      where ss.student_id = profiles.id and cs.counselor_id = auth.uid()
    )
  );

create policy counselor_view_results on results
  for select using (
    exists (
      select 1 from assessment_sessions s
      join student_schools ss on ss.student_id = s.student_id
      join counselor_schools cs on cs.school_id = ss.school_id
      where s.id = results.session_id and cs.counselor_id = auth.uid()
    )
  );

create policy admin_all_profiles on profiles
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );
```

---

## 3. Algoritmo de cálculo

Implementar como Edge Function no Supabase.

### Passo 1 — Score RIASEC

```
Para cada fator F (1..6):
  itens_F = cod onde interest_items.fator = F
  soma_F = soma das respostas para esses itens
  max_F = len(itens_F) * 5
  pct_F = round(soma_F / max_F * 100)
```

### Passo 2 — Score Inteligências

```
Para cada inteligência I (1..7):
  itens_I = ordem_nova onde intelligence_items.inteligencia_cod = I
  soma_I = soma das respostas
  max_I = 4 * 5 = 20
  pct_I = round(soma_I / max_I * 100)

top_strengths   = 3 maiores
top_challenges  = 3 menores
```

### Passo 3 — Score por profissão

```
Para cada occupation O:
  itens_O = occupation_items.item_cod onde esco = O.esco e item_cod > 0
  respostas_validas = respostas existentes para esses itens
  se vazio: pular
  score_O = média(respostas_validas)
```

### Passo 4 — Score por área CNAEF macro

```
top_50 = profissões ordenadas por score_O desc, limitadas a 50
peso_area = {}
para cada O em top_50:
  formacoes = trainings join training_iscos onde isco_4dig = O.isco_4dig
  para cada T em formacoes onde T.cnaef não nulo:
    peso_area[T.cnaef_n1] += O.score

top3_areas = primeiras 3 chaves de sort(peso_area, desc)
```

### Passo 5 — Detalhamento (subáreas)

```
para cada area_n1 do top 3:
  agrupar trainings por T.cnaef detalhado
  somar peso por subárea
  retornar subáreas ordenadas + lista de formações
```

### Notas

- `cnaef_n1 == 0` → "Educação"; `cnaef_n1 == 90` → "Desenvolvimento Pessoal" (caso especial)
- Ignorar `cnaef` nulo silenciosamente
- Filtrar `item_cod = 0` em `occupation_items` na importação

---

## 4. Estrutura de telas

### 4.1 Landing (público)

Inspirado em `pop_prae_2026__10_.png`, sem branding institucional.

- Header: logo "POPOV" + "Sobre" + "Entrar"
- Hero: título "POPOV", subtítulo "Programa de Orientação Profissional e Vocacional", pergunta "Que pergunta sobre o seu futuro profissional você tem agora?", botões "Iniciar" / "Entrar"
- Quatro cards: Autoconhecimento / Planejamento / Oportunidades / Ação
- Bloco "Sobre o programa"
- Footer

**Cores:** verde-água #2BA88C primária, azul claro #4F8FFF, roxo #6C5CE7. Header em **navy escuro #0F172A** ou **grafite #1F2937** (não usar o azul institucional). Sem laranja.

### 4.2 Dashboard do estudante

Reaproveita o layout de `pop_prae_2026__11_.png`.

- Header fixo
- Abas: **Autoconhecimento | Planejamento | Oportunidades | Ação**
- Lateral esquerda com sub-itens

**Sub-itens da aba Autoconhecimento (PT-BR adaptado):**

1. **Sobre você** — texto explicativo
2. **Faça sua avaliação** — questionário
3. **Seus resultados** — perfil RIASEC + pontos fortes
4. **Recomendações de carreira** — placeholder (v2 com IA)

### 4.3 Telas do questionário

Duas etapas sequenciais, 7 itens por página.

**Etapa 1 — Interesses (47 itens, 7 páginas):**
Likert 1-5: "Não gosto nada" / "Gosto pouco" / "Indiferente" / "Gosto" / "Gosto muito"

**Etapa 2 — Inteligências (28 itens, 4 páginas):**
Likert 1-5: "Nada como eu" / "Pouco como eu" / "Mais ou menos" / "Bastante como eu" / "Totalmente como eu"

Auto-save, barra de progresso global, botão final "Concluir e ver resultados".

### 4.4 Tela de relatório (online)

Layout vertical, scrollável:

1. Cabeçalho — nome, escola/turma, data
2. Perfil RIASEC — barras horizontais + descrições
3. Pontos Fortes & Desafios — 3+3 cards
4. Itinerários Profissionais — radar das 9 áreas, vértices clicáveis
5. Top 3 Áreas detalhadas
6. Caminhos formativos — agrupados por nível brasileiro
7. Próximos passos
8. Exportar PDF

### 4.5 Painel do orientador

Lista de estudantes vinculados (via escola), filtros, click → relatório read-only.

### 4.6 Backoffice

Dashboard, CRUD de escolas, CRUD de orientadores, lista de estudantes, importação dos xlsx.

---

## 5. Texto dos 47 itens de interesses — adaptado PT-BR

Use estes textos no seed de `interest_items` (`cod | item_text | fator`):

```
1   | Trabalhar com animais ou ao ar livre.                                                    | 1
2   | Planejar e projetar residências, parques e espaços públicos.                             | 1
3   | Plantar e cuidar de uma horta ou de plantas.                                             | 1
4   | Operar, controlar e planejar o funcionamento de máquinas.                                | 1
5   | Praticar atividades físicas.                                                             | 1
6   | Envolver-me em atividades de defesa e segurança pública.                                 | 1
7   | Participar e competir em eventos esportivos.                                             | 1
8   | Escrever para um jornal ou outro meio de comunicação.                                    | 2
9   | Desenvolver aplicativos para celulares e outras tecnologias.                             | 2
10  | Dominar assuntos da atualidade e saber falar sobre qualquer tema.                        | 2
11  | Informar-me sobre assuntos variados e dedicar bastante tempo à leitura.                  | 2
12  | Analisar dados ou sistemas.                                                              | 2
13  | Estudar e resolver problemas científicos.                                                | 2
14  | Participar de experimentos de laboratório ou estudo de doenças e tratamentos.            | 2
15  | Criar peças de design (moda, produtos, móveis etc.).                                     | 3
16  | Escrever contos ou romances.                                                             | 3
17  | Cantar em um coral ou banda, ou tocar um instrumento em uma orquestra ou banda.          | 3
18  | Selecionar obras de arte para museus.                                                    | 3
19  | Desenvolver novos produtos ou serviços em uma empresa.                                   | 3
20  | Desenvolver atividades criativas relacionadas a teatro e arte dramática.                 | 3
21  | Pintar, desenhar ou esculpir.                                                            | 3
22  | Organizar shows, espetáculos, concursos, viagens e outras atividades de lazer.           | 4
23  | Ajudar outras pessoas a aprender novos conhecimentos.                                    | 4
24  | Cuidar e tratar de pessoas doentes.                                                      | 4
25  | Ouvir, aconselhar e apoiar pessoas.                                                      | 4
26  | Prestar serviços de apoio social em comunidades e bairros.                               | 4
27  | Resolver problemas relacionados à vida das pessoas.                                      | 4
28  | Ajudar pessoas a tomar decisões.                                                         | 4
29  | Liderar projetos relevantes para a vida das pessoas e para a sociedade.                  | 5
30  | Liderar outras pessoas ou grupos.                                                        | 5
31  | Ser responsável pela condução ou organização de um evento, festa ou reunião.             | 5
32  | Criar uma campanha publicitária.                                                         | 5
33  | Falar, expor e defender ideias em público.                                               | 5
34  | Persuadir os outros a mudarem de opinião ou comportamento.                               | 5
35  | Dirigir e liderar as atividades de uma empresa.                                          | 5
36  | Planejar e gerenciar orçamentos.                                                         | 6
37  | Organizar e gerenciar o arquivo (documentação) de uma empresa.                           | 6
38  | Desenvolver métodos mais eficientes de trabalho.                                         | 6
39  | Gerenciar o trabalho (tarefas) de outras pessoas.                                        | 6
40  | Analisar e prever cenários econômicos nacionais e internacionais.                        | 6
41  | Estabelecer planos e metas de trabalho.                                                  | 6
42  | Aconselhar empresas e pessoas em temas financeiros e contábeis.                          | 6
43  | Realizar tarefas que envolvam algum esforço físico.                                      | 1
44  | Organizar e fazer a manutenção de espaços ou equipamentos.                               | 1
45  | Atuar com atendimento ou prestação de serviço ao público.                                | 4
46  | Trabalhar em restaurantes ou na área de gastronomia.                                     | 4
47  | Fabricar, processar e transformar materiais.                                             | 1
```

---

## 6. Texto dos 28 itens de inteligências — adaptado PT-BR

Seed de `intelligence_items` (`ordem_nova | item_text | inteligencia_cod`):

```
1  | Você participa ativamente de diálogos, debates e conversas.                                                                                                         | 1
2  | Você manipula objetos e materiais diferentes com a intenção de contar, comparar, ordenar, pesar e medir.                                                            | 2
3  | Você se lembra de cores, tamanhos, rostos, objetos e cenários em diferentes lugares e circunstâncias (posições, distâncias etc.).                                  | 3
4  | Você imita, com expressividade, gestos e movimentos de pessoas (familiares, amigos, professores) e profissionais (atletas, atores, humoristas, dançarinos).        | 4
5  | Você se lembra e reproduz com facilidade melodias que escuta.                                                                                                       | 5
6  | Você se integra com facilidade em situações que permitem conhecer e se relacionar com outras pessoas (conversas, trabalho em equipe, jogos, projetos sociais).     | 6
7  | Você reflete sobre o que faz, sente ou diz.                                                                                                                         | 7
8  | Você comunica e relata com facilidade diferentes tipos de histórias (de pessoas, viagens, trabalhos etc.).                                                          | 1
9  | Você identifica e interpreta números em diversos contextos (transportes, datas, preços, descontos, localizações, horários, informações econômicas, esportivas etc.). | 2
10 | Você analisa e valoriza obras de arte considerando critérios como cor, tamanho, perspectiva e proporção.                                                            | 3
11 | Você monta e desmonta objetos com facilidade.                                                                                                                       | 4
12 | Você cantarola, canta e se move com ritmo, de forma espontânea, enquanto realiza diferentes tarefas.                                                                | 5
13 | Você costuma ser aceito ou visto como líder natural.                                                                                                                | 6
14 | Você reconhece as emoções (alegria, tristeza, medo) que sente e quais são suas razões.                                                                              | 7
15 | Você presta atenção a palavras, expressões e informações e tenta incluí-las no seu discurso.                                                                        | 1
16 | Você resolve enigmas, charadas e jogos matemáticos.                                                                                                                 | 2
17 | Você interpreta corretamente mapas e plantas.                                                                                                                       | 3
18 | Você mantém o equilíbrio e o controle em movimentos e deslocamentos para alcançar objetivos concretos (construir, modelar, traçar, atingir, depositar, extrair etc.). | 4
19 | Você interpreta com instrumentos e com a voz melodias e canções, destacando na execução a letra, o ritmo e a entonação.                                            | 5
20 | Os outros mostram interesse e desejo de estar na sua companhia.                                                                                                     | 6
21 | Você reconhece suas qualidades e defeitos mais marcantes (forças e fraquezas).                                                                                      | 7
22 | Você consegue escrever cartas, histórias e textos em geral, transmitindo adequadamente ideias, emoções e experiências.                                              | 1
23 | Você resolve situações-problema e realiza cálculos com rapidez.                                                                                                     | 2
24 | Você utiliza ilustrações (figuras, sinais) para estudar e recordar com mais facilidade.                                                                             | 3
25 | Você emprega, em jogos, esportes e danças, os movimentos apropriados para uma determinada finalidade (lançar, receber, atingir, ultrapassar etc.).                  | 4
26 | Você identifica instrumentos musicais e suas características, e cria com qualquer tipo de objeto outros instrumentos.                                               | 5
27 | Você se coloca no lugar dos outros (empatia): o que gostam, sentem e pensam.                                                                                        | 6
28 | Você ouve, com interesse, recomendações para melhorar suas qualidades e corrigir seus erros.                                                                        | 7
```

---

## 7. Prompt para o Figma Make — em blocos sequenciais

O Figma Make trabalha melhor em pedidos pequenos e iterativos. Não cole tudo de uma vez. Cada bloco abaixo é uma conversa separada com o Figma Make, na ordem.

### Bloco 1 — Setup do projeto e landing

```
Crie um projeto chamado POPOV (Programa de Orientação Profissional e Vocacional).

Stack:
- Frontend: React + TypeScript + Tailwind
- Backend: Supabase (auth + Postgres + RLS)
- Idioma: português do Brasil

Identidade visual:
- Mood: sério, profissional, sóbrio. Sem emojis, sem ícones cartoon, sem ilustrações infantis. Tom adulto e direto.
- Paleta:
  - Fundo principal: #0F172A (navy escuro)
  - Fundo secundário: #1E293B
  - Primária: #2BA88C (verde-água)
  - Secundária: #4F8FFF (azul claro)
  - Terciária: #6C5CE7 (roxo, com moderação)
  - Texto principal: #F1F5F9
  - Texto secundário: #94A3B8
- Tipografia: Inter (Google Fonts), pesos 400/500/600/700
- Cantos arredondados sutis (rounded-lg = 8px)
- Espaçamento generoso

Crie apenas a landing page com:
1. Header: logo "POPOV" à esquerda, links "Sobre" e botão "Entrar" à direita
2. Hero centralizado:
   - Título: "POPOV"
   - Subtítulo: "Programa de Orientação Profissional e Vocacional"
   - Pergunta: "Que pergunta sobre o seu futuro profissional você tem agora?"
   - Dois botões: "Iniciar" (verde-água, primário) e "Entrar" (cinza, secundário)
3. Grid 2x2 de cards:
   - "Autoconhecimento" (verde-água) — "Por que você deveria se conhecer melhor?"
   - "Planejamento" (azul claro) — "O que considerar ao planejar sua carreira?"
   - "Oportunidades" (azul mais escuro) — "Quais são suas opções de trabalho e desenvolvimento?"
   - "Ação" (roxo) — "Que medidas tomar?"
4. Bloco "Sobre o programa" com 3 parágrafos:
   "O POPOV é um programa de orientação profissional e vocacional voltado para estudantes do Ensino Fundamental II e do Ensino Médio."
   "Nosso objetivo é apoiar você na descoberta de áreas profissionais alinhadas aos seus interesses e habilidades, oferecendo um relatório personalizado com profissões e caminhos formativos reais."
   "Através de quatro pilares — Autoconhecimento, Planejamento, Oportunidades e Ação — buscamos ajudar você a tomar decisões mais conscientes sobre seu futuro."
5. Footer com 2 colunas: Contato (e-mail genérico de placeholder) | Sobre (links institucionais placeholder)

Sem vídeo, sem emojis. Layout responsivo (mobile + desktop).
```

### Bloco 2 — Setup do Supabase e schema

```
Configure o Supabase no projeto. No editor SQL do Supabase, execute:

[COLE AQUI todo o SQL das seções 2.1, 2.2, 2.3 e 2.4 deste documento]

No projeto, crie:
- lib/supabase.ts exportando o cliente Supabase configurado com NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
- hooks/useAuth.ts retornando user atual + estados loading/erro
- middleware ou guard de rotas que redireciona para /login quando user é null em rotas protegidas
```

### Bloco 3 — Importação das tabelas de referência

```
Crie a rota /admin/import (protegida, role='admin'), com 5 botões — um para cada tabela de referência. Cada botão faz upload de um arquivo .xlsx e popula a tabela correspondente. Use a biblioteca xlsx para parsing.

Lógica de cada botão:

1. "Importar interest_items" — lê itens_questionario_interesses.xlsx. Filtra apenas linhas com cod, item E fator preenchidos (47 linhas válidas; ignora as 152 vazias). 

ATENÇÃO: NÃO use os textos da planilha (estão em PT-PT). Use os textos PT-BR adaptados que estão na seção 5 deste documento. Cole-os como seed SQL direto antes de fazer upload, ou use eles em vez do conteúdo do xlsx no parser.

Recomendação: para esta tabela, faça seed direto via SQL (copiar/colar os 47 INSERT) em vez de usar o botão de import.

2. "Importar intelligence_items" — mesma situação. Use os 28 itens PT-BR da seção 6 deste documento como seed SQL direto.

3. "Importar occupations + occupation_items" — lê profissoes_para_itens.xlsx. Para cada linha:
   - Deriva isco_4dig: pega `esco`, remove o ponto, pega os primeiros 4 caracteres. Ex: "3141.2" → "3141". Para escos curtos como "0110", isco_4dig = "0110".
   - Insere em occupations: esco, isco_4dig, prof, mymentor, onet.
   - Para cada item_1..item_10 não nulo E maior que 0, insere uma linha em occupation_items (esco, item_cod). Ignora valores 0.

4. "Importar trainings + training_iscos" — lê formacoes_para_profissoes_matriz_29012026.xlsx. Para cada linha:
   - Calcula qnq_label aplicando este mapeamento (case-sensitive). Se valor não bater nenhuma chave, usa "Não especificado":
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
   - Insere em trainings: name_search, qnq_original (valor original), qnq_label, cnaef.
   - Calcula cnaef_n1: se cnaef nulo, cnaef_n1=null; senão, primeiro dígito da cnaef (Math.floor(cnaef / 100) ou converter para string e pegar primeiro caractere). Caso especial: se cnaef começar com "9" (cnaef >= 90 e < 100, ou cnaef = 90), cnaef_n1=90.
   - Para cada código em isco_cod_level4 (que pode ser uma string com vírgulas como "7316, 7132"), faz split por ',', trim de cada item, e insere uma linha em training_iscos.

5. "Importar cnaef_areas" — lê CNAEF_CAE_cod.xlsx. ATENÇÃO: substitui os textos pelos PT-BR conforme dicionário abaixo ANTES de inserir. Não armazenar os textos PT-PT originais.

   Substituições Nível 1:
   - "Educação" → "Educação"
   - "Artes e humanidade" → "Artes e Humanidades"
   - "Ciências Sociais, Comércio e Direito" → "Ciências Sociais, Negócios e Direito"
   - "Ciências, Matemática e Informática" → "Ciências Exatas, Matemática e Computação"
   - "Engenharia, Indústrias Transformadoras e Construção" → "Engenharia, Produção e Construção"
   - "Agricultura" → "Agricultura e Recursos Naturais"
   - "Saúde e Protecção Social" → "Saúde e Bem-estar Social"
   - "Serviços" → "Serviços"
   - "Desenvolvimento pessoal" → "Desenvolvimento Pessoal"

   Substituições Nível 2:
   - "Programas Gerais" → "Programas Gerais"
   - "Programas de Base" → "Programas de Base"
   - "Alfabetização" → "Alfabetização"
   - "Educação" → "Educação"
   - "Formação de Professores / Formadores e Ciências da Educação" → "Formação de Professores e Ciências da Educação"
   - "Artes" → "Artes"
   - "Humanidades" → "Humanidades"
   - "Ciências Sociais e do Comportamento" → "Ciências Sociais e Comportamentais"
   - "Informação e Jornalismo" → "Comunicação e Jornalismo"
   - "Ciências Empresariais" → "Administração e Negócios"
   - "Direito" → "Direito"
   - "Ciências da Vida" → "Ciências Biológicas"
   - "Ciências Físicas" → "Ciências Físicas e Naturais"
   - "Matemática e Estatística" → "Matemática e Estatística"
   - "Informática" → "Computação e Informática"
   - "Engenharia e Técnicas Afins" → "Engenharia e Áreas Técnicas"
   - "Indústrias Transformadoras" → "Produção Industrial"
   - "Arquitectura e Construção" → "Arquitetura e Construção"
   - "Agricultura, Silvicultura e Pescas" → "Agricultura, Silvicultura e Pesca"
   - "Ciências Veterinárias" → "Medicina Veterinária"
   - "Saúde" → "Saúde"
   - "Serviços Sociais" → "Serviço Social"
   - "Serviços Pessoais" → "Serviços Pessoais"
   - "Serviços de Transporte" → "Transporte e Logística"
   - "Protecção do Ambiente" → "Meio Ambiente"
   - "Serviços de Segurança" → "Segurança"
   - "Desconhecido ou não Especificado" → "Não especificado"

Cada botão mostra progresso (X de Y inseridos) e erros, se houver. Use upsert para permitir re-importação.
```

### Bloco 4 — Auth e onboarding

```
Crie as telas de autenticação:

1. /signup — formulário com:
   - Nome completo
   - E-mail
   - Senha (mín. 8 caracteres)
   - "Tipo de cadastro": radio com 2 opções
     a) "Sou estudante (cadastro individual)"
     b) "Estou cadastrando por uma escola"
   - Se opção (b) selecionada, aparecem campos:
     - "Selecione sua escola" (dropdown populado de schools onde active=true)
     - "Série / Ano" (texto livre, ex: "9º ano EF", "1ª série EM", "2ª série EM", "3ª série EM")
     - "Turma" (texto livre, ex: "Turma A")
   - Aviso visual no rodapé do formulário: "Acesso gratuito durante a fase beta."

2. /login — e-mail + senha + link "Esqueci minha senha"

3. Após signup bem-sucedido:
   a) cria registro em auth.users (Supabase Auth padrão)
   b) cria registro em profiles com role='student' e full_name preenchido
   c) Se opção (b), cria também registro em student_schools

4. Após login: redireciona para /app

5. Recuperação de senha simples (redirect via e-mail)

Não implemente pagamento ainda — todo cadastro é gratuito.
```

### Bloco 5 — Dashboard do estudante (estrutura)

```
Crie a rota /app (protegida, role='student').

Layout:
- Header fixo: logo POPOV + nome do usuário + botão "Sair"
- Abas horizontais logo abaixo: Autoconhecimento | Planejamento | Oportunidades | Ação
  - Aba ativa em verde-água (#2BA88C), inativas em cinza
- Layout em duas colunas:
  - Lateral esquerda: cards verticais empilhados, cada um com nome curto. Sem ícones cartoon. Use traços finos de ícone neutro (line-icon do Lucide ou similar) ou apenas texto.
  - Área principal à direita: conteúdo do sub-item ativo

Sub-itens da aba Autoconhecimento (4 cards laterais):
1. "Sobre você"
2. "Faça sua avaliação"
3. "Seus resultados"
4. "Recomendações de carreira"

No primeiro acesso, só "Sobre você" está desbloqueado. Os outros aparecem com indicação visual de bloqueio (cadeado pequeno, opacidade 50%) e estado "Bloqueado". Sub-itens desbloqueiam em sequência: precisa completar o anterior.

Conteúdo de cada sub-item:

1. "Sobre você": 3 parágrafos:
   "O POPOV é um programa de orientação que ajuda você a conhecer melhor seus interesses, habilidades e possíveis caminhos profissionais."
   "Você vai responder dois questionários: um sobre seus interesses e outro sobre suas habilidades. Não existem respostas certas ou erradas — apenas as que mais se parecem com você."
   "No final, você verá um relatório com áreas profissionais que combinam com seu perfil, profissões reais associadas e formações disponíveis para chegar lá."
   Botão "Continuar" no final libera o próximo sub-item.

2. "Faça sua avaliação": botão grande "Iniciar avaliação". Ao clicar, vai para /app/questionario.

3. "Seus resultados": só desbloqueia quando o questionário estiver completo. Mostra um resumo com card "Ver relatório completo" que leva para /app/resultados.

4. "Recomendações de carreira": placeholder com texto "Em breve. Esta etapa estará disponível em uma próxima versão do programa."

Para as outras abas (Planejamento, Oportunidades, Ação), por enquanto cada uma mostra um placeholder simples: "Disponível após você completar a avaliação." ou "Em breve."
```

### Bloco 6 — Questionário (etapas 1 e 2)

```
Crie a rota /app/questionario.

Fluxo:
1. Ao entrar, verifica se existe assessment_sessions com status='in_progress' do usuário. Se sim, retoma. Se não, cria nova (status='in_progress', student_id=auth.uid()) e guarda session_id em estado.

2. Etapa 1: Interesses. 47 itens (carregar de interest_items, ordenar por cod ASC). Mostrar 7 itens por página = 7 páginas (a 7ª com 5 itens).

3. Etapa 2: Inteligências. 28 itens (carregar de intelligence_items, ordenar por ordem_nova ASC). Mostrar 7 itens por página = 4 páginas.

Cada item mostra:
- Numeração ("Pergunta X de Y" no topo da página)
- Texto do item em destaque
- Escala Likert horizontal com 5 botões radio:
  - Etapa 1: "Não gosto nada" / "Gosto pouco" / "Indiferente" / "Gosto" / "Gosto muito"
  - Etapa 2: "Nada como eu" / "Pouco como eu" / "Mais ou menos" / "Bastante como eu" / "Totalmente como eu"

Comportamento:
- Resposta salva em interest_answers OU intelligence_answers imediatamente ao clicar (auto-save com upsert).
- Botões "Anterior" e "Próximo" no rodapé. "Próximo" só ativa quando todos os itens da página estão respondidos.
- Barra de progresso no topo, mostrando avanço total combinado das duas etapas (47+28=75 itens).
- Permite voltar e mudar resposta.
- Ao completar a 4ª página da etapa 2, botão muda para "Concluir e ver resultados". Esse botão:
  a) atualiza assessment_sessions: status='completed', completed_at=now()
  b) chama Edge Function calculate_results com { session_id }
  c) redireciona para /app/resultados

Salvar progresso: se o usuário sair no meio, ao voltar para /app/questionario, retoma da página onde parou (calcular: total respondidas por etapa / 7 = página atual).

Comunicar transição entre etapas: tela intermediária ao final da Etapa 1 com texto "Você concluiu a primeira parte. Agora vamos avaliar suas habilidades — leve cerca de 10 minutos." e botão "Continuar".
```

### Bloco 7 — Edge Function de cálculo

```
Crie uma Edge Function no Supabase chamada calculate_results. Recebe { session_id } no body. Valida que o session_id pertence ao usuário autenticado. Retorna 200 OK ou 400 com mensagem.

Algoritmo (TypeScript / Deno):

1. Validar:
   - session existe e student_id = auth.uid()
   - count(interest_answers where session_id=...) = 47
   - count(intelligence_answers where session_id=...) = 28
   - se faltar respostas, retornar 400 com mensagem clara.

2. Calcular RIASEC scores:
   - Para cada fator F (1..6):
     - itens = SELECT cod FROM interest_items WHERE fator = F
     - respostas = SELECT answer FROM interest_answers WHERE session_id = ? AND item_cod IN (itens)
     - soma = sum(respostas)
     - max = len(itens) * 5
     - pct = round(soma / max * 100)
   - Resultado: { "1": 40, "2": 100, "3": 40, ... }

3. Calcular intelligence scores:
   - Mesma lógica, usando intelligence_items.inteligencia_cod (1..7) e intelligence_answers.
   - top_strengths = 3 inteligências com maior pct (em caso de empate, cod menor primeiro)
   - top_challenges = 3 com menor pct (em caso de empate, cod menor primeiro)

4. Calcular occupation_scores:
   - Para cada esco em occupations:
     - itens_cod = SELECT item_cod FROM occupation_items WHERE esco = ? AND item_cod > 0
     - respostas = SELECT answer FROM interest_answers WHERE session_id = ? AND item_cod IN (itens_cod)
     - se vazio: pular
     - score = mean(respostas)
   - Ordenar desc, pegar top 50 com {esco, prof, score, isco_4dig}

5. Calcular cnaef_n1_scores:
   - peso = {} (chave int)
   - Para cada O em top 50 occupations:
     - SELECT t.cnaef_n1 FROM trainings t JOIN training_iscos ti ON ti.training_id = t.id
       WHERE ti.isco_4dig = O.isco_4dig AND t.cnaef_n1 IS NOT NULL
     - Para cada n1 retornado: peso[n1] += O.score
   - Para cada n1 em peso, buscar nome em cnaef_areas (where is_n1=true and cod=n1)
   - Resultado ordenado desc: [{cod: 4, nome: "Ciências Exatas, Matemática e Computação", score: 201.5}, ...]

6. Calcular cnaef_detailed:
   - Mesmo loop, chave = t.cnaef inteiro (não n1)
   - Anexar nome via JOIN com cnaef_areas onde cod = t.cnaef

7. top3_areas = primeiras 3 chaves de cnaef_n1_scores ordenado desc

8. Upsert em results: session_id, riasec_scores, intel_scores, top_strengths, top_challenges, occupation_scores (top 50), cnaef_n1_scores, cnaef_detailed, top3_areas, generated_at = now()

Retornar 200 com { ok: true, session_id }
```

### Bloco 8 — Tela de relatório (parte 1)

```
Crie a rota /app/resultados (protegida).

Ao carregar, busca a última results do usuário (via última assessment_sessions completed do auth.uid()). Se não houver, mostra "Você ainda não completou sua avaliação" com botão para o questionário.

Layout vertical, scrollável. Seções em cards grandes (#1E293B), espaçamento generoso entre seções.

SEÇÃO 1 — Cabeçalho:
- Título: "Seu Relatório POPOV"
- Subtítulo: nome do estudante (profiles.full_name), escola e turma se houver, data de geração (formato DD/MM/AAAA)
- Sem ilustração

SEÇÃO 2 — Perfil de interesses (RIASEC):
- Título: "Seu perfil de interesses"
- Texto curto: "Estes são os 6 perfis de interesses profissionais. Quanto maior o percentual, mais suas respostas indicam afinidade com aquele perfil."
- Layout em 2 colunas (em desktop):
  - Esquerda: gráfico de barras horizontais. 6 barras, uma por fator (1 a 6). Largura proporcional ao %, valor numérico ao final. Cores em degradê do verde-água #2BA88C.
  - Direita: 6 mini-cards empilhados verticalmente. Cada um com nome do perfil e descrição. Carregar de riasec_factors.
- Em mobile: gráfico em cima, mini-cards em baixo.

SEÇÃO 3 — Pontos Fortes & Desafios:
- Título: "Suas habilidades"
- Subtítulo: "Estes são os pontos em que você se destaca naturalmente, e as áreas onde pode investir mais para se desenvolver."
- Linha 1: "Seus pontos fortes" — 3 cards em verde-água (#2BA88C), um para cada cod em top_strengths
- Linha 2: "Áreas para desenvolver" — 3 cards cinza (#475569), um para cada cod em top_challenges
- Cada card mostra:
  - Nome da inteligência (intelligences.nome)
  - Descrição (intelligences.descricao)
  - Barra fina mostrando o % calculado (intel_scores[cod])

Em mobile: linha 1 e linha 2 viram coluna de 6 cards empilhados (3 verdes + 3 cinzas).
```

### Bloco 9 — Tela de relatório (parte 2)

```
Continue a tela /app/resultados adicionando após a Seção 3:

SEÇÃO 4 — Itinerários Profissionais:
- Título: "Suas áreas profissionais"
- Texto introdutório: "Com base nas suas respostas, identificamos as áreas formativas que mais combinam com seu perfil. Cada vértice do gráfico representa uma área. Clique em qualquer vértice para ver as profissões e formações associadas."
- Gráfico RADAR (teia de aranha) com as 9 áreas CNAEF de Nível 1. Use recharts (RadarChart). Eixo de 0 a 100.
  - Os valores vêm de results.cnaef_n1_scores normalizados: o maior score vira 100, os outros proporcionais.
  - Os 9 vértices são clicáveis. Ao clicar em um vértice, abre painel lateral (drawer à direita) com:
    - Nome da área (PT-BR adaptado, vem de cnaef_areas.nivel_1)
    - Descrição genérica (template fixo): "Esta área engloba formações e profissões relacionadas a [nome da área]. Veja abaixo as subáreas e formações disponíveis."
    - Lista de subáreas (Nível 2): SELECT cod, nivel_2 FROM cnaef_areas WHERE is_n1=false AND first_digit_of(cod) = primeiro dígito da macro-área (use uma função SQL ou faça filtro no client). Para cada subárea, mostrar peso se houver em results.cnaef_detailed; se peso=0, mostrar como "(sem peso significativo)" mas ainda listar.
    - Botão "Ver formações" que mostra lista de trainings.name_search com cnaef_n1 = essa área, agrupadas por qnq_label.

Em mobile: o radar chart vira uma lista vertical ranqueada de áreas com barras horizontais.

SEÇÃO 5 — Top 3 Áreas detalhadas:
- Título: "Suas 3 áreas mais alinhadas"
- 3 cards grandes empilhados, um para cada cod em top3_areas. Cada card com:
  - Nome da área + % de afinidade. O % é calculado: (score_dessa_area / score_da_maior_area) * 100, arredondado.
  - Bloco "Profissões nesta área": listar até 5 prof de occupation_scores que tenham isco_4dig que apareça em algum training_iscos cujo training tenha cnaef_n1 igual à área.
  - Bloco "Formações disponíveis": listar até 10 trainings.name_search com cnaef_n1 = área, agrupados por qnq_label. Mostrar nome + label QNQ.
```

### Bloco 10 — Tela de relatório (parte 3)

```
Adicione à tela /app/resultados:

SEÇÃO 6 — Caminhos formativos:
- Título: "Possíveis caminhos formativos"
- Para cada cod em top3_areas, um card com:
  - Nome da área (PT-BR)
  - Texto fixo: "Para seguir nesta área, você pode considerar formações em diferentes níveis. Abaixo, alguns exemplos disponíveis."
  - Lista agrupada por qnq_label, na ordem:
    1. "Ensino Médio + Curso Técnico"
    2. "Curso Técnico Pós-Médio / Tecnólogo (curta duração)"
    3. "Graduação (Bacharelado, Licenciatura ou Tecnólogo)"
    4. "Pós-graduação (Especialização ou Mestrado)"
    5. "Curso Livre / Formação Profissional"
    6. "Certificação Profissional"
    7. Outros (qualquer outro qnq_label)
  - Cada agrupamento mostra até 5 formações reais (de trainings).
  - Esconder agrupamentos sem formações.

SEÇÃO 7 — Próximos passos:
- Título: "E agora?"
- Texto fixo: "Este relatório é uma orientação, não uma resposta definitiva. Use estes resultados como ponto de partida para conversar com sua família, com seu orientador, e para pesquisar mais sobre as áreas e profissões que despertaram seu interesse. Quanto mais você se conhecer e explorar, mais clara ficará a sua escolha."
- Em uma versão futura, esta seção será personalizada por IA.
- Dois botões:
  - "Exportar PDF" (gera versão imprimível usando react-to-print)
  - "Refazer avaliação" (com confirmação modal: "Isso vai criar uma nova avaliação. Seus resultados atuais serão mantidos no histórico. Continuar?")

Após a Seção 7, footer simples com link para "Sair".
```

### Bloco 11 — Painel do orientador

```
Crie a rota /counselor (protegida, role='counselor').

Layout:
- Header igual ao do estudante mas com indicação "Painel do Orientador"
- Título: "Meus estudantes"
- Filtros no topo (linha horizontal):
  - Dropdown "Escola" (popula de counselor_schools do orientador logado)
  - Dropdown "Turma" (texto único de student_schools.class_name daqueles estudantes)
  - Dropdown "Status" (Todos / Em andamento / Completos / Não iniciados)
  - Campo de busca (filtro por nome do estudante)
- Tabela:
  - Colunas: Nome | E-mail | Escola | Turma | Status | Última atividade | Ações
  - Coluna Ações: botão "Ver relatório" (só ativo se Status=Completo)
- Click em "Ver relatório" → /counselor/student/[student_id]
  - Mostra o mesmo relatório que o estudante vê, em modo somente leitura
  - Header indica "Visualizando relatório de: [Nome do estudante]"
  - Botão "Voltar para a lista" no topo

A RLS já filtra estudantes vinculados, então o select pode ser:
SELECT p.id, p.full_name, p.email, ss.class_name, ss.grade, sch.name as school_name,
       latest.status, latest.completed_at
FROM profiles p
JOIN student_schools ss ON ss.student_id = p.id
JOIN schools sch ON sch.id = ss.school_id
LEFT JOIN LATERAL (
  SELECT status, completed_at FROM assessment_sessions
  WHERE student_id = p.id ORDER BY started_at DESC LIMIT 1
) latest ON true
WHERE p.role = 'student'

Mobile: tabela vira lista de cards.
```

### Bloco 12 — Backoffice de admin

```
Crie a rota /admin (protegida, role='admin'). Layout em abas verticais à esquerda:

ABA 1 — Dashboard:
- 5 cards de métricas: Total de estudantes / Total de orientadores / Total de escolas / Sessões em andamento / Sessões completas (últimos 30 dias)
- Gráfico de barras: sessões completas por dia nos últimos 30 dias

ABA 2 — Escolas:
- Lista paginada com busca por nome
- Botão "Adicionar escola" → modal: nome, cidade, estado (UF), ativo
- Botão "Editar" em cada linha
- Botão "Desativar" (soft delete: active=false)

ABA 3 — Orientadores:
- Lista paginada
- Botão "Adicionar orientador" → modal: nome, e-mail, senha temporária, escola(s) (multi-select)
  - Ao salvar, chama Edge Function admin_create_counselor:
    a) cria user via supabase.auth.admin.createUser (precisa service role key)
    b) cria profile com role='counselor'
    c) cria registros em counselor_schools
- Botão "Ver estudantes" → mostra lista vinculada via escolas

ABA 4 — Estudantes:
- Lista paginada de TODOS os estudantes
- Filtros: escola, turma, status
- Click → /admin/student/[id] mostra relatório completo

ABA 5 — Importação de bases:
- Embute a página /admin/import já criada no Bloco 3

ABA 6 — Configurações:
- Lista de admins (read-only)
- Para criar o admin inicial, executar SQL direto no Supabase:
  UPDATE profiles SET role = 'admin' WHERE email = 'seu_email_admin@exemplo.com';
```

### Bloco 13 — Polimento final

```
Ajustes finais:

1. Loading states em todas as rotas que carregam dados (skeletons em listas, spinners em botões durante save).

2. Empty states com mensagens claras:
   - Orientador sem estudantes: "Nenhum estudante vinculado às suas escolas ainda."
   - Estudante sem resultados: "Você ainda não completou sua avaliação. [Botão: Iniciar agora]"
   - Admin sem escolas: "Cadastre a primeira escola para começar."

3. Tratamento de erros: nunca expor mensagens cruas do Supabase. Log no console para debug, mostra mensagem amigável.

4. Validações de formulário:
   - E-mail: regex padrão
   - Senha: mínimo 8 caracteres
   - Nome: mínimo 3 caracteres
   - Erros inline abaixo de cada campo

5. Confirmação modal antes de ações destrutivas (refazer avaliação, desativar escola).

6. Acessibilidade:
   - Alt text em imagens
   - Navegação por teclado (Tab, Enter, Escape)
   - Contraste mínimo AA WCAG
   - Labels associadas a inputs

7. Responsividade mobile:
   - Tabela do orientador → lista de cards em < 768px
   - Gráfico radar → barras horizontais em mobile
   - Abas horizontais → dropdown em mobile

8. SEO básico:
   - Title e meta description em rotas públicas
   - Open Graph na landing

9. Sem emojis em lugar nenhum. Sem ilustrações IA. Sem stock images. Tom profissional sóbrio.
```

---

## 8. O que fica de fora desta v1

- Texto narrativo da recomendação do orientador (gerado por IA) — próxima etapa
- "Profissões do futuro" — base não fornecida
- Descrições textuais ricas de cada área CNAEF — placeholders curtos na v1
- Pagamento / paywall — sem pagamento na v1
- Vagas de emprego — fase 2

---

## 9. Checklist final antes de começar

- [x] Itens dos questionários adaptados PT-BR (seções 5 e 6)
- [x] Áreas CNAEF adaptadas PT-BR (seção 1.4)
- [x] Níveis QNQ adaptados para terminologia brasileira (seção 1.3)
- [x] Inteligências adaptadas PT-BR (seção 1.5)
- [x] Relatório mostra 3 maiores + 3 menores inteligências
- [ ] Criar projeto no Supabase e copiar URL + anon key
- [ ] Criar projeto no Figma Make e iniciar com o Bloco 1
- [ ] Definir e-mail do admin inicial (para o UPDATE de role pós-cadastro)
