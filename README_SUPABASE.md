# Configuração do Supabase - POPOV

## Passo 1: Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Aguarde a criação do banco de dados

## Passo 2: Executar o SQL

1. No painel do Supabase, vá em **SQL Editor**
2. Clique em **New Query**
3. Copie TODO o conteúdo do arquivo `SUPABASE_SETUP.sql`
4. Cole no editor SQL
5. Clique em **Run** para executar
6. Verifique que não houve erros

## Passo 3: Configurar variáveis de ambiente

1. No painel do Supabase, vá em **Project Settings** > **API**
2. Copie a **Project URL**
3. Copie a **anon public** key
4. Crie um arquivo `.env` na raiz do projeto:

```
VITE_SUPABASE_URL=sua_url_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_aqui
```

## Passo 4: Testar

Execute o projeto e teste o roteamento:
- `/` - Landing page (pública)
- `/login` - Login (placeholder)
- `/signup` - Signup (placeholder)
- `/app` - Dashboard estudante (protegida)
- `/counselor` - Dashboard orientador (protegida)
- `/admin` - Backoffice admin (protegida)

As rotas protegidas redirecionam para `/login` se o usuário não estiver autenticado.
