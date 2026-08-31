require('dotenv').config();
const {Pool}=require('pg');
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true}});
const posts=[
  {title:'Experiência e preparo para transformar boas ideias em resultados',slug:'experiencia-e-preparo-para-transformar-ideias-em-resultados',excerpt:'A trajetória de Sanches Paiva em quatro funções no Executivo reúne gestão, articulação, desenvolvimento econômico e captação de recursos.',content:`## Uma trajetória construída na gestão pública

Antes de chegar à Câmara Municipal, Sanches Paiva acumulou experiência em quatro funções no Executivo de Cidade Ocidental. A passagem por diferentes áreas da administração ajudou a formar uma visão ampla sobre as prioridades do município e os caminhos necessários para transformar projetos em resultados.

Como **chefe de Gabinete**, acompanhou de perto a gestão e as demandas da cidade. Na função de **secretário municipal de Governo**, atuou na articulação e no acompanhamento da administração municipal.

## Desenvolvimento e oportunidades

À frente da Secretaria de Desenvolvimento Econômico, Turismo e Trabalho, a atuação esteve voltada à criação de oportunidades, ao empreendedorismo e à valorização das vocações locais. A experiência também incluiu a Secretaria de Convênios e Captação de Recursos, área estratégica para viabilizar políticas públicas.

Esse percurso contribuiu para mais de **50 programas e projetos** de impacto social e econômico. É uma base de conhecimento que hoje orienta a atuação legislativa e o compromisso com um mandato próximo das pessoas.

> Política se faz com presença, preparo e coragem para transformar boas ideias em resultados.`,cover_url:'/assets/photos/sanches-paiva-perfil.png',cover_alt:'Retrato oficial de Sanches Paiva',category:'Mandato em ação',tags:['trajetória','gestão pública','mandato','Cidade Ocidental'],featured:true},
  {title:'Feirão do Emprego aproxima trabalhadores e empresas da região',slug:'feirao-do-emprego-aproxima-trabalhadores-e-empresas',excerpt:'A iniciativa conecta trabalhadores de Cidade Ocidental às empresas e às oportunidades disponíveis no mercado regional.',content:`## Caminhos para quem busca uma oportunidade

O **Feirão do Emprego** nasceu com uma proposta direta: aproximar trabalhadores locais das empresas e das vagas disponíveis no mercado regional. A iniciativa faz parte de uma atuação voltada ao desenvolvimento econômico, à geração de renda e à criação de caminhos para quem trabalha e produz.

Ao reunir oportunidades em um mesmo ambiente, o projeto facilita o contato entre candidatos e empregadores. Essa aproximação fortalece a circulação de informações sobre vagas e ajuda empresas a encontrar profissionais da própria cidade e da região.

## Emprego e renda como prioridade

Criar oportunidades exige articulação, conhecimento da realidade local e diálogo com o setor produtivo. Por isso, emprego e renda estão entre as bandeiras centrais do mandato.

O Feirão integra um conjunto de mais de 50 programas e projetos desenvolvidos ao longo da trajetória de Sanches Paiva na gestão pública. Cada iniciativa reforça o compromisso com uma Cidade Ocidental que valoriza seus trabalhadores, seus empreendedores e o potencial de sua população.

> Desenvolvimento econômico é criar caminhos para quem trabalha e empreende.`,cover_url:'/assets/photos/album-do-mandato.png',cover_alt:'Álbum do Mandato Sanches Paiva em Campo',category:'Juventude e oportunidades',tags:['emprego','renda','oportunidades','desenvolvimento econômico'],featured:true},
  {title:'Ocidental Gastro movimenta comércio, cultura e turismo',slug:'ocidental-gastro-movimenta-comercio-cultura-e-turismo',excerpt:'Projeto valoriza empreendedores, fortalece a economia criativa e divulga as vocações culturais e turísticas de Cidade Ocidental.',content:`## Economia criativa em movimento

O **Ocidental Gastro** reúne comércio, empreendedorismo, cultura e turismo em uma iniciativa voltada à valorização da economia local. O projeto reconhece que a gastronomia pode gerar oportunidades, atrair público e fortalecer a identidade de Cidade Ocidental.

Ao dar visibilidade a negócios e iniciativas locais, o evento cria um ambiente favorável para novos contatos, circulação de renda e divulgação do trabalho de quem empreende no município.

## Identidade que também gera desenvolvimento

O desenvolvimento econômico pode caminhar junto com a preservação das tradições. A valorização do turismo religioso, da cultura e de produtos ligados à história local — como o tradicional doce de marmelo — ajuda a mostrar o que Cidade Ocidental tem de único.

Essa combinação de economia criativa, turismo e identidade amplia as possibilidades para empreendedores e fortalece o sentimento de pertencimento da comunidade. É trabalho que movimenta a cidade e transforma suas vocações em oportunidades.`,cover_url:'/assets/photos/cidade-ocidental-hero.webp',cover_alt:'Vista de Cidade Ocidental',category:'Cultura e turismo',tags:['Ocidental Gastro','turismo','cultura','empreendedorismo'],featured:false},
  {title:'Licença-paternidade de 20 dias fortalece famílias de servidores municipais',slug:'licenca-paternidade-20-dias-fortalece-familias',excerpt:'Proposta amplia de cinco para 20 dias a licença-paternidade dos servidores públicos municipais, apoiando mães e bebês.',content:`## Mais presença nos primeiros dias de vida

A ampliação da licença-paternidade de **cinco para 20 dias** para os servidores públicos municipais coloca a valorização das famílias no centro da atuação legislativa.

Os primeiros dias após o nascimento de um bebê exigem cuidado, adaptação e apoio. Uma licença maior permite que o pai participe mais ativamente desse período, fortaleça os vínculos familiares e compartilhe as responsabilidades dentro de casa.

## Apoio às mães e cuidado com os bebês

A medida também amplia o suporte às mães em uma fase de grandes mudanças físicas e emocionais. A presença do pai contribui para uma rede de cuidado mais próxima e dá à família mais tempo para organizar sua nova rotina.

Políticas públicas voltadas às famílias produzem efeitos que alcançam toda a comunidade. A proposta traduz uma das bandeiras do mandato: fortalecer vínculos, promover cuidado e garantir mais dignidade para as pessoas.`,cover_url:'/assets/photos/sanches-paiva-perfil.png',cover_alt:'Sanches Paiva, vereador de Cidade Ocidental',category:'Projetos e leis',tags:['licença-paternidade','família','servidores públicos','lei'],featured:true},
  {title:'Proteção da Bandeira e do Brasão preserva a identidade de Cidade Ocidental',slug:'protecao-bandeira-brasao-identidade-cidade-ocidental',excerpt:'Proteção jurídica dos símbolos municipais reconhece 31 anos de emancipação e reforça o respeito à história da cidade.',content:`## Símbolos que contam a história da cidade

A Bandeira e o Brasão representam a trajetória, os valores e o sentimento de pertencimento da população de Cidade Ocidental. A criação de proteção jurídica para esses símbolos preserva a identidade do município e reconhece seus **31 anos de emancipação**.

Proteger o patrimônio municipal significa garantir que referências importantes da história da cidade sejam respeitadas e transmitidas às próximas gerações.

## Respeito aos pioneiros e compromisso com o futuro

Para Sanches Paiva, essa responsabilidade também está ligada à própria história familiar. Neto do pioneiro Francisco “Chico” Paiva, um dos cofundadores e ex-presidente do MDB local, o vereador cresceu próximo a uma trajetória de serviço à comunidade.

Esse legado não é apenas uma herança familiar. Ele representa respeito por quem ajudou a construir as bases políticas, estruturais e sociais de Cidade Ocidental. Preservar a memória do município é reconhecer os pioneiros e, ao mesmo tempo, construir o futuro com consciência das próprias raízes.`,cover_url:'/assets/photos/sanches-e-chico-paiva.png',cover_alt:'Sanches Paiva ao lado de seu avô, Chico Paiva, na Câmara Municipal',category:'Projetos e leis',tags:['história','identidade','Bandeira','Brasão','Cidade Ocidental'],featured:false}
];
(async()=>{const admin=(await pool.query('select id from admins order by created_at limit 1')).rows[0];if(!admin)throw new Error('Nenhum administrador cadastrado.');for(let i=0;i<posts.length;i++){const p=posts[i],publishedAt=new Date(Date.now()-(posts.length-1-i)*86400000).toISOString();await pool.query(`insert into posts(title,slug,excerpt,content,cover_url,cover_alt,category,tags,gallery,status,featured,published_at,created_by) values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,'[]'::jsonb,'published',$9,$10,$11) on conflict(slug) do update set title=excluded.title,excerpt=excluded.excerpt,content=excluded.content,cover_url=excluded.cover_url,cover_alt=excluded.cover_alt,category=excluded.category,tags=excluded.tags,status='published',featured=excluded.featured,published_at=excluded.published_at,updated_at=now()`,[p.title,p.slug,p.excerpt,p.content,p.cover_url,p.cover_alt,p.category,JSON.stringify(p.tags),p.featured,publishedAt,admin.id]);console.log(`Publicada: ${p.title}`)}await pool.end()})().catch(async e=>{console.error(e);await pool.end();process.exit(1)});
