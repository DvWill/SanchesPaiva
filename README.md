# Site institucional — Sanches Paiva

Site institucional com blog, painel editorial e o canal de atendimento ao cidadão **Alô, Sanches**. O backend usa Express e PostgreSQL; o painel administrativo utiliza autenticação própria com senha protegida por bcrypt e sessão em cookie `HttpOnly`.

## Desenvolvimento local

1. Instale Node.js 18 ou superior e execute `npm install`.
2. Crie um banco PostgreSQL e copie `.env.example` para `.env`.
3. Preencha `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `RATE_LIMIT_SECRET`.
4. Execute `npm start`. Na inicialização, `database/schema.sql` é aplicado de forma idempotente.
5. Abra `http://localhost:3000` e acesse o painel em `http://localhost:3000/admin`.
6. Rode `npm test` e `npm run build` antes de publicar.

## Banco de dados do Alô, Sanches

- `citizen_requests`: demanda principal, protocolo, contato, localização, categoria, consentimentos, situação e resposta pública.
- `citizen_request_updates`: histórico de mudanças, com conteúdo público, anotação interna, encaminhamento e administrador responsável.
- `citizen_rate_limits`: limitação de cadastros e consultas por identificador pseudonimizado.
- `admins` e `admin_sessions`: usuários administrativos e sessões autenticadas.

O protocolo é criado exclusivamente no servidor no formato `AS-AAAAMMDD-XXXXXX`. Cadastro e primeira movimentação são gravados na mesma transação. A consulta pública usa `POST` e exige protocolo mais telefone; não retorna telefone, Instagram, aniversário nem anotações internas.

## Variáveis de ambiente

```dotenv
DATABASE_URL=postgresql://usuario:senha@host/banco?sslmode=require
ADMIN_EMAIL=admin@seudominio.com.br
ADMIN_PASSWORD=troque-por-uma-senha-forte
RATE_LIMIT_SECRET=gere-uma-frase-aleatoria-longa-e-secreta
TRUST_PROXY=1
PORT=3000
```

`DATABASE_URL`, `ADMIN_PASSWORD` e `RATE_LIMIT_SECRET` são segredos de servidor e nunca devem ser incluídos no frontend. Gere `RATE_LIMIT_SECRET` com pelo menos 32 caracteres aleatórios. Use `TRUST_PROXY=1` quando o aplicativo estiver atrás de um proxy confiável; use `0` no acesso local direto.

## Primeiro administrador

Defina `ADMIN_EMAIL` e `ADMIN_PASSWORD` no ambiente do servidor antes do primeiro acesso. O servidor cria o usuário somente se o e-mail ainda não existir, tanto no início do processo Node.js quanto no primeiro login de uma função serverless. Essas variáveis não alteram a senha de um usuário já existente. Depois do primeiro acesso, retire `ADMIN_PASSWORD` do ambiente de produção se a plataforma permitir e mantenha o segredo em um cofre seguro.

## Gestão das demandas

1. Entre em `/admin/login`.
2. Acesse **Demandas** no cabeçalho do painel.
3. Pesquise ou filtre por categoria, situação e período.
4. Abra a demanda para alterar a situação, informar o órgão responsável, publicar uma atualização ou adicionar uma anotação interna.
5. Cada mudança registra data, situação e usuário administrativo. Somente atualizações públicas aparecem para o cidadão.

## Publicação

Para que cadastro e consulta funcionem, publique o projeto em uma hospedagem Node.js/serverless conectada ao PostgreSQL. Não publique somente a pasta `dist`, pois ela contém apenas os arquivos estáticos.

Na Vercel, `vercel.json` encaminha `/api/*` para `server.js` e mantém as rotas amigáveis. Antes do primeiro deploy, execute `database/schema.sql` no banco de produção e configure todas as variáveis de ambiente. Em outra hospedagem Node.js, use `npm start` e mantenha HTTPS obrigatório.

O build estático (`npm run build`) continua disponível para validar e empacotar a parte visual, mas o Alô, Sanches depende do backend ativo.

## Supabase editorial

O projeto também mantém uma integração opcional e separada com Supabase para o conteúdo editorial. Quando ela for usada, configure somente a URL do projeto e a chave pública `anon` em `data.js`. Nunca coloque uma chave `service_role` no navegador. Essa integração não é necessária para as demandas, que usam o PostgreSQL do backend existente.

## Dependências externas pendentes

- Provisionar o PostgreSQL de produção e aplicar `database/schema.sql`.
- Configurar os segredos de ambiente na hospedagem.
- Criar o primeiro administrador.
- Confirmar HTTPS, domínio final e política de backup/retenção do banco.
- Revisar os dados de contato e o prazo de retenção do Aviso de Privacidade com o responsável jurídico do gabinete antes da publicação definitiva.
