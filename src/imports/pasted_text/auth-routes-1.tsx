CONTEXTO ATUAL DO PROJETO POPOV:
Blocos 1, 2 e 3 concluídos. Existe: Landing funcional em /, placeholders de Login e Signup, dashboards protegidos (StudentDashboard, CounselorDashboard, AdminDashboard) com ProtectedRoute, página AdminImport em /admin/import, hook useAuth, cliente Supabase. Tabelas e seeds populados (47 itens, 28 itens, 6 RIASEC, 7 inteligências). RLS desabilitado para testes.

ANTES DE IMPLEMENTAR, ME LISTE:
1. Quais arquivos NOVOS você vai criar
2. Quais arquivos EXISTENTES você vai modificar
3. Que dependências novas vai instalar
Aguarde minha confirmação antes de executar.

TAREFA: Bloco 4 — Auth funcional (signup e login)

Substitua os placeholders de Login.tsx e Signup.tsx por implementações funcionais.

ROTA /signup
- Layout: card centralizado (max-w-md), fundo #1E293B, padding p-8, rounded-xl, sombra suave
- Posicionamento: tela vertical, centralizado horizontalmente, padding-top mt-16
- Título h1: "Criar conta no POPOV" (text-2xl bold, branco, mb-6)

Campos do formulário (em ordem):
1. "Nome completo" (input text)
   - Validação: mínimo 3 caracteres
2. "E-mail" (input email)
   - Validação: regex /^[^\s@]+@[^\s@]+\.[^\s@]+$/
3. "Senha" (input password)
   - Validação: mínimo 8 caracteres
   - Botão "mostrar/ocultar" à direita do campo (ícone Eye/EyeOff do Lucide)
4. "Tipo de cadastro" — radio com 2 opções, sempre visíveis:
   - "Sou estudante (cadastro individual)"
   - "Estou cadastrando por uma escola"
5. Se "estou cadastrando por uma escola" estiver marcado, mostrar 3 campos extras (animação de slide-down):
   - "Selecione sua escola" — dropdown populado de:
     SELECT id, name FROM schools WHERE active=true ORDER BY name
     Se não houver escolas, mostrar texto "Nenhuma escola cadastrada ainda. Selecione 'Sou estudante' ou aguarde."
   - "Série / Ano" — input text livre, placeholder: "Ex: 9º ano EF, 1ª série EM, 2ª série EM, 3ª série EM"
   - "Turma" — input text livre, placeholder: "Ex: Turma A"

Cada campo tem label acima e área de erro inline em vermelho #EF4444 logo abaixo.

Botões e links:
- Botão "Criar conta" — verde-água #2BA88C, full width, mt-6
  Desabilitado se: algum campo obrigatório vazio, ou validação falhando
  Com spinner durante submit, texto muda para "Criando..."
- Aviso pequeno mt-4: "Acesso gratuito durante a fase beta."
- Link no rodapé do card: "Já tem conta? Entrar" (texto secundário com underline no hover) — leva para /login

Lógica de submissão:
1. Validar todos os campos client-side. Se houver erros, mostra inline e cancela.
2. Chamar:
   const { data, error } = await supabase.auth.signUp({
     email,
     password,
     options: { data: { full_name } }
   })
3. Se error, exibir mensagem amigável (mapeamento abaixo) e parar.
4. Se sucesso, inserir profile:
   await supabase.from('profiles').insert({
     id: data.user.id,
     role: 'student',
     full_name,
     email
   })
5. Se "estou cadastrando por uma escola" foi selecionado e os 3 campos preenchidos:
   await supabase.from('student_schools').insert({
     student_id: data.user.id,
     school_id,
     grade,
     class_name
   })
6. Redirecionar para /app via navigate('/app')

Mapeamento de erros:
- Mensagem do Supabase contendo "User already registered" ou "already exists" → "Este e-mail já está cadastrado. Tente entrar."
- "Password should be at least" → "A senha precisa ter pelo menos 8 caracteres."
- "Invalid email" → "E-mail inválido."
- Outros → "Não foi possível criar a conta. Tente novamente em alguns instantes."

ROTA /login
- Layout idêntico ao /signup
- Título h1: "Entrar no POPOV"
- Campos:
  - E-mail
  - Senha (com mostrar/ocultar)
- Botão "Entrar" verde-água full width
- Link "Esqueci minha senha" abaixo do botão (texto secundário pequeno) — leva para /forgot-password
- Link no rodapé: "Não tem conta? Criar conta" — leva para /signup

Lógica de submissão:
1. Validar campos.
2. Chamar:
   const { data, error } = await supabase.auth.signInWithPassword({ email, password })
3. Se error: "E-mail ou senha incorretos."
4. Se sucesso, buscar profile.role:
   const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
5. Redirecionar conforme role:
   - role='student' → /app
   - role='counselor' → /counselor
   - role='admin' → /admin
   - Se profile não existir (caso raro): /app por padrão

ROTA /forgot-password
- Layout idêntico, card centralizado
- Título: "Recuperar senha"
- Texto: "Digite seu e-mail e enviaremos um link para redefinir a senha."
- Campo: e-mail
- Botão "Enviar link de recuperação"
- Lógica:
   await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
- Após sucesso, exibir mensagem: "Enviamos um e-mail para [endereço]. Verifique sua caixa de entrada."
- Link "Voltar para entrar" no rodapé

ROTA /reset-password
- Acessada via link do e-mail
- Layout idêntico
- Título: "Definir nova senha"
- Campos: nova senha + confirmar nova senha
- Validação: mínimo 8 caracteres, ambos iguais
- Lógica:
   await supabase.auth.updateUser({ password: newPassword })
- Após sucesso, redirecionar para /login com mensagem "Senha redefinida. Entre com a nova senha."

REGRAS:
- Não modifique a Landing nem outras páginas
- Não modifique o App.tsx além de adicionar as rotas /forgot-password e /reset-password
- Não use emojis em lugar nenhum
- Mensagens de erro sempre amigáveis, nunca expor erro cru do Supabase ao usuário
- Tom adulto e direto, sem exclamações desnecessárias