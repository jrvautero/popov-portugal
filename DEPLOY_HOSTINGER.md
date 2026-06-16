# Deploy do POPOV Brasil no Hostinger (dominio proprio)

Front-end estatico (Vite/React) no Hostinger. Banco e autenticacao permanecem no Supabase.

## Pre-requisitos (na sua maquina)
- Node.js 18+ instalado
- Acesso ao painel Hostinger (hPanel) e ao dominio
- Acesso ao painel Supabase do projeto

---

## 1. Preparar o projeto localmente
```
npm install
cp .env.example .env
```
Edite o `.env` e cole a chave anon real do Supabase em `VITE_SUPABASE_ANON_KEY`.

## 2. Build
```
npm run build
```
Gera a pasta `dist/` com o site estatico. Se ocorrer erro, ele aparece aqui — resolver antes de prosseguir.

## 3. Confirmar o .htaccess no build
Apos o build, verifique se existe `dist/.htaccess`.
Se NAO existir (alguns builds ignoram dotfiles), copie manualmente o `.htaccess` da raiz do projeto para dentro de `dist/`.

## 4. Upload para o Hostinger
- hPanel > Arquivos > Gerenciador de Arquivos
- Entre em `public_html`
- Apague o conteudo padrao (ex.: `default.php`, `index.html` de exemplo)
- Envie TODO o conteudo de DENTRO de `dist/` para `public_html`
  (os arquivos, nao a pasta dist em si)
- Confirme que `public_html/.htaccess` esta presente

## 5. Apontar o dominio
- Se o dominio foi comprado no Hostinger: ja aponta para `public_html` automaticamente.
- Se o dominio e externo: em hPanel, registre o dominio e configure os nameservers do Hostinger no registrador, ou aponte os registros A para o IP da hospedagem.

## 6. Configurar URLs de autenticacao no Supabase (OBRIGATORIO)
Painel Supabase > Authentication > URL Configuration:
- **Site URL**: https://SEU-DOMINIO
- **Redirect URLs**: adicione
  - https://SEU-DOMINIO
  - https://SEU-DOMINIO/reset-password
Sem isso, login por email, confirmacao de cadastro e reset de senha falham no dominio proprio.

## 7. Validacao em producao
- Abrir https://SEU-DOMINIO (landing carrega)
- Acessar direto https://SEU-DOMINIO/login (NAO pode dar 404 — testa o .htaccess)
- Login com a conta de teste
- Questionario > Resultados
- Fluxo de reset de senha (chega email e redireciona corretamente)

---

## Alteracoes futuras (fluxo de edicao direta)
1. Editar o codigo localmente
2. `npm run build`
3. Reenviar o conteudo de `dist/` para `public_html`

(Recomendado: versionar em Git para historico e rollback.)

## Decisao pendente: indexacao
O `index.html` mantem `<meta name="robots" content="noindex, nofollow">`.
- Manter = site invisivel para Google (adequado se for ferramenta fechada/por convite).
- Permitir indexacao = remover essa linha do `index.html` antes do build.
