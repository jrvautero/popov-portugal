-- ============================================
-- POPOV - Setup do Supabase
-- Execute este SQL completo no SQL Editor do Supabase
-- ============================================

-- ============================================
-- TABELAS DE REFERÊNCIA
-- ============================================

create table interest_items (
  cod          int primary key,
  item_text    text not null,
  fator        int not null check (fator between 1 and 6)
);
create index idx_interest_items_fator on interest_items(fator);

create table intelligence_items (
  ordem_nova        int primary key,
  item_text         text not null,
  inteligencia_cod  int not null check (inteligencia_cod between 1 and 7)
);
create index idx_intelligence_items_int on intelligence_items(inteligencia_cod);

create table riasec_factors (
  cod          int primary key,
  nome         text not null,
  descricao    text
);

create table intelligences (
  cod          int primary key,
  nome         text not null,
  descricao    text
);

create table occupations (
  esco          text primary key,
  isco_4dig     text not null,
  prof          text not null,
  mymentor      text,
  onet          text
);
create index idx_occupations_isco on occupations(isco_4dig);

create table occupation_items (
  esco          text references occupations(esco) on delete cascade,
  item_cod      int references interest_items(cod) on delete cascade,
  primary key (esco, item_cod)
);

create table trainings (
  id            bigserial primary key,
  name_search   text not null,
  qnq_original  text,
  qnq_label     text,
  cnaef         int,
  cnaef_n1      int
);
create index idx_trainings_cnaef on trainings(cnaef);
create index idx_trainings_cnaef_n1 on trainings(cnaef_n1);

create table training_iscos (
  training_id   bigint references trainings(id) on delete cascade,
  isco_4dig     text not null,
  primary key (training_id, isco_4dig)
);
create index idx_training_iscos_isco on training_iscos(isco_4dig);

create table cnaef_areas (
  cod         int primary key,
  nivel_1     text,
  nivel_2     text,
  is_n1       boolean generated always as (nivel_2 is null or trim(nivel_2) = '') stored
);
create index idx_cnaef_n1 on cnaef_areas(is_n1);

-- ============================================
-- SEEDS — RIASEC e INTELIGÊNCIAS (PT-BR)
-- ============================================

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

-- ============================================
-- SEEDS — 47 ITENS DE INTERESSES (PT-BR)
-- ============================================

insert into interest_items (cod, item_text, fator) values
  (1, 'Trabalhar com animais ou ao ar livre.', 1),
  (2, 'Planejar e projetar residências, parques e espaços públicos.', 1),
  (3, 'Plantar e cuidar de uma horta ou de plantas.', 1),
  (4, 'Operar, controlar e planejar o funcionamento de máquinas.', 1),
  (5, 'Praticar atividades físicas.', 1),
  (6, 'Envolver-me em atividades de defesa e segurança pública.', 1),
  (7, 'Participar e competir em eventos esportivos.', 1),
  (8, 'Escrever para um jornal ou outro meio de comunicação.', 2),
  (9, 'Desenvolver aplicativos para celulares e outras tecnologias.', 2),
  (10, 'Dominar assuntos da atualidade e saber falar sobre qualquer tema.', 2),
  (11, 'Informar-me sobre assuntos variados e dedicar bastante tempo à leitura.', 2),
  (12, 'Analisar dados ou sistemas.', 2),
  (13, 'Estudar e resolver problemas científicos.', 2),
  (14, 'Participar de experimentos de laboratório ou estudo de doenças e tratamentos.', 2),
  (15, 'Criar peças de design (moda, produtos, móveis etc.).', 3),
  (16, 'Escrever contos ou romances.', 3),
  (17, 'Cantar em um coral ou banda, ou tocar um instrumento em uma orquestra ou banda.', 3),
  (18, 'Selecionar obras de arte para museus.', 3),
  (19, 'Desenvolver novos produtos ou serviços em uma empresa.', 3),
  (20, 'Desenvolver atividades criativas relacionadas a teatro e arte dramática.', 3),
  (21, 'Pintar, desenhar ou esculpir.', 3),
  (22, 'Organizar shows, espetáculos, concursos, viagens e outras atividades de lazer.', 4),
  (23, 'Ajudar outras pessoas a aprender novos conhecimentos.', 4),
  (24, 'Cuidar e tratar de pessoas doentes.', 4),
  (25, 'Ouvir, aconselhar e apoiar pessoas.', 4),
  (26, 'Prestar serviços de apoio social em comunidades e bairros.', 4),
  (27, 'Resolver problemas relacionados à vida das pessoas.', 4),
  (28, 'Ajudar pessoas a tomar decisões.', 4),
  (29, 'Liderar projetos relevantes para a vida das pessoas e para a sociedade.', 5),
  (30, 'Liderar outras pessoas ou grupos.', 5),
  (31, 'Ser responsável pela condução ou organização de um evento, festa ou reunião.', 5),
  (32, 'Criar uma campanha publicitária.', 5),
  (33, 'Falar, expor e defender ideias em público.', 5),
  (34, 'Persuadir os outros a mudarem de opinião ou comportamento.', 5),
  (35, 'Dirigir e liderar as atividades de uma empresa.', 5),
  (36, 'Planejar e gerenciar orçamentos.', 6),
  (37, 'Organizar e gerenciar o arquivo (documentação) de uma empresa.', 6),
  (38, 'Desenvolver métodos mais eficientes de trabalho.', 6),
  (39, 'Gerenciar o trabalho (tarefas) de outras pessoas.', 6),
  (40, 'Analisar e prever cenários econômicos nacionais e internacionais.', 6),
  (41, 'Estabelecer planos e metas de trabalho.', 6),
  (42, 'Aconselhar empresas e pessoas em temas financeiros e contábeis.', 6),
  (43, 'Realizar tarefas que envolvam algum esforço físico.', 1),
  (44, 'Organizar e fazer a manutenção de espaços ou equipamentos.', 1),
  (45, 'Atuar com atendimento ou prestação de serviço ao público.', 4),
  (46, 'Trabalhar em restaurantes ou na área de gastronomia.', 4),
  (47, 'Fabricar, processar e transformar materiais.', 1);

-- ============================================
-- SEEDS — 28 ITENS DE INTELIGÊNCIAS (PT-BR)
-- ============================================

insert into intelligence_items (ordem_nova, item_text, inteligencia_cod) values
  (1, 'Você participa ativamente de diálogos, debates e conversas.', 1),
  (2, 'Você manipula objetos e materiais diferentes com a intenção de contar, comparar, ordenar, pesar e medir.', 2),
  (3, 'Você se lembra de cores, tamanhos, rostos, objetos e cenários em diferentes lugares e circunstâncias (posições, distâncias etc.).', 3),
  (4, 'Você imita, com expressividade, gestos e movimentos de pessoas (familiares, amigos, professores) e profissionais (atletas, atores, humoristas, dançarinos).', 4),
  (5, 'Você se lembra e reproduz com facilidade melodias que escuta.', 5),
  (6, 'Você se integra com facilidade em situações que permitem conhecer e se relacionar com outras pessoas (conversas, trabalho em equipe, jogos, projetos sociais).', 6),
  (7, 'Você reflete sobre o que faz, sente ou diz.', 7),
  (8, 'Você comunica e relata com facilidade diferentes tipos de histórias (de pessoas, viagens, trabalhos etc.).', 1),
  (9, 'Você identifica e interpreta números em diversos contextos (transportes, datas, preços, descontos, localizações, horários, informações econômicas, esportivas etc.).', 2),
  (10, 'Você analisa e valoriza obras de arte considerando critérios como cor, tamanho, perspectiva e proporção.', 3),
  (11, 'Você monta e desmonta objetos com facilidade.', 4),
  (12, 'Você cantarola, canta e se move com ritmo, de forma espontânea, enquanto realiza diferentes tarefas.', 5),
  (13, 'Você costuma ser aceito ou visto como líder natural.', 6),
  (14, 'Você reconhece as emoções (alegria, tristeza, medo) que sente e quais são suas razões.', 7),
  (15, 'Você presta atenção a palavras, expressões e informações e tenta incluí-las no seu discurso.', 1),
  (16, 'Você resolve enigmas, charadas e jogos matemáticos.', 2),
  (17, 'Você interpreta corretamente mapas e plantas.', 3),
  (18, 'Você mantém o equilíbrio e o controle em movimentos e deslocamentos para alcançar objetivos concretos (construir, modelar, traçar, atingir, depositar, extrair etc.).', 4),
  (19, 'Você interpreta com instrumentos e com a voz melodias e canções, destacando na execução a letra, o ritmo e a entonação.', 5),
  (20, 'Os outros mostram interesse e desejo de estar na sua companhia.', 6),
  (21, 'Você reconhece suas qualidades e defeitos mais marcantes (forças e fraquezas).', 7),
  (22, 'Você consegue escrever cartas, histórias e textos em geral, transmitindo adequadamente ideias, emoções e experiências.', 1),
  (23, 'Você resolve situações-problema e realiza cálculos com rapidez.', 2),
  (24, 'Você utiliza ilustrações (figuras, sinais) para estudar e recordar com mais facilidade.', 3),
  (25, 'Você emprega, em jogos, esportes e danças, os movimentos apropriados para uma determinada finalidade (lançar, receber, atingir, ultrapassar etc.).', 4),
  (26, 'Você identifica instrumentos musicais e suas características, e cria com qualquer tipo de objeto outros instrumentos.', 5),
  (27, 'Você se coloca no lugar dos outros (empatia): o que gostam, sentem e pensam.', 6),
  (28, 'Você ouve, com interesse, recomendações para melhorar suas qualidades e corrigir seus erros.', 7);

-- ============================================
-- TABELAS OPERACIONAIS
-- ============================================

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
  state         text,
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
  grade         text,
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

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table profiles              enable row level security;
alter table assessment_sessions   enable row level security;
alter table interest_answers      enable row level security;
alter table intelligence_answers  enable row level security;
alter table results               enable row level security;
alter table student_schools       enable row level security;

create policy "Estudante ve seus dados de profile" on profiles
  for select using (id = auth.uid());

create policy "Estudante atualiza seu profile" on profiles
  for update using (id = auth.uid());

create policy "Insert profile no signup" on profiles
  for insert with check (id = auth.uid());

create policy "Estudante gere sua sessao" on assessment_sessions
  for all using (student_id = auth.uid());

create policy "Estudante ve seus resultados" on results
  for select using (
    exists (select 1 from assessment_sessions s
            where s.id = results.session_id and s.student_id = auth.uid())
  );

create policy "Sistema insere resultados" on results
  for insert with check (
    exists (select 1 from assessment_sessions s
            where s.id = results.session_id and s.student_id = auth.uid())
  );

create policy "Estudante gere suas respostas interesses" on interest_answers
  for all using (
    exists (select 1 from assessment_sessions s
            where s.id = interest_answers.session_id and s.student_id = auth.uid())
  );

create policy "Estudante gere suas respostas inteligencias" on intelligence_answers
  for all using (
    exists (select 1 from assessment_sessions s
            where s.id = intelligence_answers.session_id and s.student_id = auth.uid())
  );

create policy "Estudante gere seu vinculo escolar" on student_schools
  for all using (student_id = auth.uid());

create policy "Orientador ve estudantes vinculados" on profiles
  for select using (
    exists (
      select 1 from student_schools ss
      join counselor_schools cs on cs.school_id = ss.school_id
      where ss.student_id = profiles.id and cs.counselor_id = auth.uid()
    )
  );

create policy "Orientador ve resultados de seus estudantes" on results
  for select using (
    exists (
      select 1 from assessment_sessions s
      join student_schools ss on ss.student_id = s.student_id
      join counselor_schools cs on cs.school_id = ss.school_id
      where s.id = results.session_id and cs.counselor_id = auth.uid()
    )
  );

create policy "Admin ve tudo em profiles" on profiles
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );
