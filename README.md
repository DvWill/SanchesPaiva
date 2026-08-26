# Site institucional — Sanches Paiva

Site estático em HTML, CSS e JavaScript, com blog e painel editorial conectados ao Supabase. O servidor Node local oferece as rotas limpas; o build gera `dist/` para hospedagem estática.

## Desenvolvimento

1. Instale Node.js 18 ou superior.
2. Execute `npm start` e abra `http://localhost:3000`.
3. Rode `npm test` e `npm run build` antes de publicar.

## Configuração do Supabase

1. Crie um projeto Supabase e execute `supabase/migration.sql` no SQL Editor. Se já usava a versão anterior, execute somente `supabase/002_post_metrics.sql` para adicionar métricas e o contador protegido.
2. Em Authentication > Users, crie o primeiro usuário manualmente com e-mail confirmado. Não existe cadastro público.
3. No SQL Editor, execute apenas para esse usuário: `insert into public.admins(user_id) select id from auth.users where email='EMAIL_DO_ADMIN';`.
4. Copie a Project URL e a chave pública `anon` para `supabaseUrl` e `supabaseAnonKey` em `data.js`. Nunca use a chave `service_role` no site.
5. Preencha `canonicalUrl` com o domínio final.
6. Opcionalmente, substitua `ADMIN_UUID` em `supabase/seed-editorial.sql` pelo UUID criado e execute o arquivo. As oito pautas entram como rascunhos para revisão — nenhuma é publicada automaticamente.

O conteúdo Markdown é escapado antes de ser formatado, impedindo execução de HTML ou scripts. O bucket limita arquivos a JPEG, PNG, WebP e AVIF de até 8 MB; o cliente repete essa validação. As políticas RLS permitem leitura pública somente de notícias publicadas e escrita somente para usuários presentes em `public.admins`.

## Hospedagem

Execute `npm run build` e publique a pasta `dist`. Em Netlify, `_redirects` já habilita `/blog/:slug` e as rotas administrativas. Em outra hospedagem, configure os mesmos rewrites descritos em `_redirects`. O domínio do CDN `cdn.jsdelivr.net` precisa ser permitido caso a hospedagem aplique uma Content Security Policy. Configure HTTPS e adicione a URL final em Authentication > URL Configuration no Supabase.
