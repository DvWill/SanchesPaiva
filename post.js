(async()=>{
  const article=document.querySelector('#article'),status=document.querySelector('#article-status');
  if(!article||!status)return;
  const escape=value=>APP.escape(value??'');
  const slug=new URLSearchParams(location.search).get('slug')||decodeURIComponent(location.pathname.split('/').filter(Boolean).pop()||'');
  const localPost=window.EDITORIAL_POSTS?.[slug];
  let post=localPost;

  if(!post){
    try{post=await APP.api(`/api/posts/${encodeURIComponent(slug)}?public=1`)}
    catch(error){status.innerHTML='Notícia não encontrada ou indisponível. <a href="/blog.html">Voltar ao blog</a>.';return}
  }

  const base=window.SITE_DATA?.canonicalUrl||location.origin;
  const canonical=new URL(`/post.html?slug=${encodeURIComponent(post.slug)}`,base).href;
  const imageUrl=new URL(post.cover_url||APP.fallbackImage,canonical).href;
  const upsert=(selector,tag,attributes)=>{let element=document.head.querySelector(selector);if(!element){element=document.createElement(tag);document.head.append(element)}Object.entries(attributes).forEach(([key,value])=>element.setAttribute(key,value));return element};
  document.title=post.seo_title_exact?post.seo_title:`${post.seo_title||post.title} | Sanches Paiva`;
  upsert('meta[name="description"]','meta',{name:'description',content:post.seo_description||post.excerpt});
  upsert('link[rel="canonical"]','link',{rel:'canonical',href:canonical});
  upsert('meta[property="og:type"]','meta',{property:'og:type',content:'article'});
  upsert('meta[property="og:locale"]','meta',{property:'og:locale',content:'pt_BR'});
  upsert('meta[property="og:title"]','meta',{property:'og:title',content:post.seo_title||post.title});
  upsert('meta[property="og:description"]','meta',{property:'og:description',content:post.seo_description||post.excerpt});
  upsert('meta[property="og:image"]','meta',{property:'og:image',content:imageUrl});
  upsert('meta[property="og:image:alt"]','meta',{property:'og:image:alt',content:post.cover_alt||post.title});
  if(post.cover_width)upsert('meta[property="og:image:width"]','meta',{property:'og:image:width',content:String(post.cover_width)});
  if(post.cover_height)upsert('meta[property="og:image:height"]','meta',{property:'og:image:height',content:String(post.cover_height)});
  upsert('meta[property="og:url"]','meta',{property:'og:url',content:canonical});
  if(post.published_at)upsert('meta[property="article:published_time"]','meta',{property:'article:published_time',content:post.published_at});
  const schema={'@context':'https://schema.org','@type':post.published_at?'NewsArticle':'Article',headline:post.title,description:post.seo_description||post.excerpt,image:[imageUrl],mainEntityOfPage:canonical};
  if(post.published_at)schema.datePublished=post.published_at;
  if(post.updated_at)schema.dateModified=post.updated_at;
  if(post.location_name)schema.contentLocation={'@type':'Place',name:post.location_name};
  const schemaElement=document.createElement('script');schemaElement.type='application/ld+json';schemaElement.textContent=JSON.stringify(schema);document.head.append(schemaElement);
  if(post.layout==='turismo-religioso'){
    const breadcrumbSchema={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
      {'@type':'ListItem',position:1,name:'Início',item:new URL('/',base).href},
      {'@type':'ListItem',position:2,name:'Notícias',item:new URL('/blog.html',base).href},
      {'@type':'ListItem',position:3,name:post.title,item:canonical}
    ]};
    const breadcrumbSchemaElement=document.createElement('script');breadcrumbSchemaElement.type='application/ld+json';breadcrumbSchemaElement.textContent=JSON.stringify(breadcrumbSchema);document.head.append(breadcrumbSchemaElement);
  }

  const imageByName=name=>post.images.find(image=>image.url.endsWith(name));
  const picture=(image,className='')=>`<figure class="${className}"><img src="${escape(image.url)}" alt="${escape(image.alt)}" width="${image.width}" height="${image.height}" loading="lazy" decoding="async"><figcaption>${escape(image.caption)}</figcaption></figure>`;
  const quote=entry=>`<blockquote class="og-quote"><p>“${escape(entry.text)}”</p><footer>— ${escape(entry.credit)}</footer></blockquote>`;

  function renderEditorial(){
    const s=post.sections,q=post.quotes;
    const stats=post.stats.map(stat=>{const numeric=typeof stat.value==='number';return `<li><strong${numeric?` data-count-target="${stat.value}" data-count-prefix="${escape(stat.prefix||'')}"`:''}>${numeric?'0':escape(stat.value)}</strong><span>${escape(stat.label)}</span></li>`}).join('');
    const gallery=post.gallery.map((image,index)=>`<button class="og-gallery-item" type="button" data-lightbox-index="${index}" aria-label="Ampliar imagem: ${escape(image.alt)}"><img src="${escape(image.url)}" alt="${escape(image.alt)}" width="${image.width}" height="${image.height}" loading="lazy" decoding="async"></button>`).join('');
    article.className='article og-article';
    article.innerHTML=`
      <header class="og-hero">
        <figure class="og-hero-media"><img src="${escape(post.cover_url)}" alt="${escape(post.cover_alt)}" width="${post.cover_width}" height="${post.cover_height}" fetchpriority="high" decoding="async"></figure>
        <div class="og-hero-shade" aria-hidden="true"></div>
        <div class="wrap og-hero-content">
          <nav class="breadcrumb" aria-label="Navegação estrutural"><a href="/">Início</a><span>/</span><a href="/blog.html">Notícias</a><span>/</span><span aria-current="page">Ocidental Gastrô</span></nav>
          <p class="og-kicker">${escape(post.category)}</p>
          <h1>${escape(post.title)}</h1>
          <p class="og-deck">${escape(post.excerpt)}</p>
          <p class="og-location"><span aria-hidden="true">⌖</span>${escape(post.location)}</p>
          <a class="og-scroll-cue" href="#introducao">Continuar lendo <span aria-hidden="true">↓</span></a>
        </div>
      </header>

      <div class="og-story">
        <section class="og-intro og-section" id="introducao" aria-labelledby="introducao-titulo">
          <div class="og-reading og-reveal">
            <p class="og-section-label">Primeira edição</p>
            <h2 id="introducao-titulo" class="sr-only">Ocidental Gastrô no Lago Jacob</h2>
            ${s.intro.map(text=>`<p>${escape(text)}</p>`).join('')}
            <aside class="og-highlight">${escape(post.highlight)}</aside>
          </div>
        </section>

        <section class="og-stats" aria-label="Números do Ocidental Gastrô">
          <div class="wrap"><ul>${stats}</ul></div>
        </section>

        <section class="og-section" aria-labelledby="sabores-titulo">
          <div class="wrap og-split og-reveal">
            <div class="og-copy">
              <p class="og-section-label">Experiência gastronômica</p>
              <h2 id="sabores-titulo">Sabores que representam a cidade</h2>
              ${s.gastronomy.map(text=>`<p>${escape(text)}</p>`).join('')}
            </div>
            <div class="og-food-collage">
              ${picture(imageByName('preparo-panela-noite.webp'),'og-photo-tall')}
              ${picture(imageByName('expositoras-doces.webp'),'og-photo-wide')}
              ${picture(imageByName('equipe-santiago-bbq.webp'),'og-photo-small')}
            </div>
          </div>
        </section>

        <section class="og-section og-culture" aria-labelledby="cultura-titulo">
          <div class="wrap og-reveal">
            <div class="og-copy og-copy-wide">
              <p class="og-section-label">Cultura, música e lazer</p>
              <h2 id="cultura-titulo">Muito além da gastronomia</h2>
              ${s.culture.map(text=>`<p>${escape(text)}</p>`).join('')}
            </div>
            <div class="og-attractions" aria-label="Atrações musicais">${post.attractions.map((name,index)=>`<span><small>${String(index+1).padStart(2,'0')}</small>${escape(name)}</span>`).join('')}</div>
            <div class="og-culture-grid">
              ${picture(imageByName('palco-evento.webp'),'og-stage-photo')}
              ${picture(imageByName('visitantes-panela-gastronomica.webp'),'og-public-photo')}
              ${quote(q.resident)}
            </div>
          </div>
        </section>

        <section class="og-section og-organization" aria-labelledby="organizacao-titulo">
          <div class="wrap og-split og-reveal">
            <div class="og-copy">
              <p class="og-section-label">Realização coletiva</p>
              <h2 id="organizacao-titulo">Uma organização construída em parceria</h2>
              ${s.organization.map(text=>`<p>${escape(text)}</p>`).join('')}
              <ul class="og-partners">${post.partners.map(partner=>`<li>${escape(partner)}</li>`).join('')}</ul>
            </div>
            <div class="og-organization-media">
              ${picture(imageByName('equipe-organizacao-centro-artesao.webp'))}
              ${picture(imageByName('vistoria-estrutura-lago.webp'))}
            </div>
          </div>
          <div class="og-reading og-reveal">${quote(q.institute)}</div>
        </section>

        <section class="og-section og-impact" aria-labelledby="impacto-titulo">
          <div class="wrap og-reveal">
            <div class="og-impact-photo">${picture(imageByName('lago-jacob.webp'))}</div>
            <div class="og-impact-panel">
              <p class="og-section-label">Economia e turismo</p>
              <h2 id="impacto-titulo">Um evento que movimenta toda a cidade</h2>
              ${s.impact.map(text=>`<p>${escape(text)}</p>`).join('')}
              ${quote(q.tourism)}
            </div>
          </div>
        </section>

        <section class="og-section og-gallery-section" aria-labelledby="galeria-titulo">
          <div class="wrap og-reveal">
            <p class="og-section-label">Memória visual</p>
            <h2 id="galeria-titulo">Veja como foi o Ocidental Gastrô</h2>
            <p class="og-gallery-intro">Gastronomia, encontros, cultura e preparação em um dos principais cartões-postais da cidade.</p>
            <div class="og-gallery">${gallery}</div>
          </div>
        </section>

        <section class="og-closing" aria-labelledby="encerramento-titulo">
          <div class="og-reading og-reveal">
            <p class="og-section-label">Identidade local</p>
            <h2 id="encerramento-titulo">Uma celebração da cidade</h2>
            <p>${escape(s.closing)}</p>
            <p class="og-source">Fonte: ${escape(post.source_name)}</p>
            <div class="og-closing-actions"><a class="btn og-secondary" href="/blog.html">← Voltar para todas as notícias</a><button class="btn" id="share-article" type="button">Compartilhar notícia <span aria-hidden="true">↗</span></button></div>
            <p class="og-toast" id="share-toast" role="status" aria-live="polite"></p>
          </div>
        </section>
      </div>

      <div class="og-lightbox" id="event-lightbox" role="dialog" aria-modal="true" aria-labelledby="lightbox-title" hidden>
        <h2 class="sr-only" id="lightbox-title">Galeria ampliada do Ocidental Gastrô</h2>
        <button class="og-lightbox-close" type="button" aria-label="Fechar galeria">×</button>
        <button class="og-lightbox-nav og-lightbox-prev" type="button" aria-label="Imagem anterior">←</button>
        <figure><img alt=""><figcaption><span id="lightbox-caption"></span><b id="lightbox-counter" aria-live="polite"></b></figcaption></figure>
        <button class="og-lightbox-nav og-lightbox-next" type="button" aria-label="Próxima imagem">→</button>
      </div>`;
    initEditorial();
  }

  function renderEmploymentEditorial(){
    const s=post.sections,q=post.quotes;
    const stats=post.stats.map(stat=>`<li><strong>${stat.prefixLabel?`<small>${escape(stat.prefixLabel)}</small>`:''}<b data-count-target="${stat.value}" data-count-prefix="${escape(stat.prefix||'')}" data-count-suffix="${escape(stat.suffix||'')}"${stat.format?` data-count-format="${escape(stat.format)}"`:''}>0</b></strong><span>${escape(stat.label)}</span></li>`).join('');
    const gallery=post.gallery.map((image,index)=>`<button class="fe-gallery-item" type="button" data-lightbox-index="${index}" aria-label="Ampliar imagem: ${escape(image.alt)}"><img src="${escape(image.url)}" alt="${escape(image.alt)}" width="${image.width}" height="${image.height}" loading="lazy" decoding="async"></button>`).join('');
    const image=name=>imageByName(name);
    article.className='article fe-article';
    document.body.classList.add('employment-post');
    article.innerHTML=`
      <header class="fe-hero">
        <figure class="fe-hero-media"><img src="${escape(post.cover_url)}" alt="${escape(post.cover_alt)}" width="${post.cover_width}" height="${post.cover_height}" fetchpriority="high" decoding="async"></figure>
        <div class="fe-hero-shade" aria-hidden="true"></div>
        <div class="wrap fe-hero-content">
          <nav class="breadcrumb" aria-label="Navegação estrutural"><a href="/">Início</a><span>/</span><a href="/blog.html">Notícias</a><span>/</span><span aria-current="page">Feirão do Emprego</span></nav>
          <div class="fe-hero-copy">
            <p class="fe-kicker">${escape(post.category)}</p>
            <h1>${escape(post.title)}</h1>
            <p class="fe-deck">${escape(post.excerpt)}</p>
            <div class="fe-meta"><time datetime="${escape(post.published_at)}">${escape(post.date_label)}</time><span>${escape(post.location)}</span></div>
            <a class="fe-scroll" href="#introducao">Continuar lendo <span aria-hidden="true">↓</span></a>
          </div>
        </div>
      </header>

      <div class="fe-story">
        <section class="fe-section" id="introducao" aria-labelledby="fe-intro-title">
          <div class="fe-reading og-reveal">
            <p class="fe-section-label">Trabalho e desenvolvimento</p>
            <h2 class="sr-only" id="fe-intro-title">A terceira edição do Feirão do Emprego</h2>
            ${s.intro.map(text=>`<p>${escape(text)}</p>`).join('')}
          </div>
        </section>

        <section class="fe-stats" aria-label="Números do 3º Feirão do Emprego">
          <div class="wrap"><ul>${stats}</ul></div>
        </section>

        <section class="fe-section" aria-labelledby="fe-opportunities-title">
          <div class="wrap fe-split og-reveal">
            <div class="fe-copy">
              <p class="fe-section-label">Emprego perto de casa</p>
              <h2 id="fe-opportunities-title">Oportunidades mais perto da população</h2>
              ${s.opportunities.map(text=>`<p>${escape(text)}</p>`).join('')}
              <blockquote class="fe-quote"><p>“${escape(q.opportunity.text)}”</p><footer>— ${escape(q.opportunity.credit)}</footer></blockquote>
            </div>
            <div class="fe-media-stack">
              ${picture(image('atendimento-servicos.webp'))}
              ${picture(image('entrada-feirao.webp'))}
            </div>
          </div>
        </section>

        <section class="fe-section fe-qualification" aria-labelledby="fe-qualification-title">
          <div class="wrap fe-split og-reveal">
            <div class="fe-qualification-media">
              ${picture(image('orientacao-publico.webp'))}
              ${picture(image('atendimento-meio-ambiente.webp'))}
            </div>
            <div class="fe-copy">
              <p class="fe-section-label">Formação profissional</p>
              <h2 id="fe-qualification-title">Qualificação para gerar emprego e renda</h2>
              ${s.qualification.map(text=>`<p>${escape(text)}</p>`).join('')}
            </div>
          </div>
        </section>

        <section class="fe-section fe-services" aria-labelledby="fe-services-title">
          <div class="wrap og-reveal">
            <p class="fe-section-label">Atendimento integrado</p>
            <h2 id="fe-services-title">Serviços reunidos em um só lugar</h2>
            <p class="fe-services-lead">A programação concentrou oportunidades de trabalho, formação, apoio social, empreendedorismo e cuidado com a comunidade.</p>
            <ol class="fe-services-list">${post.services.map(service=>`<li><p>${escape(service)}.</p></li>`).join('')}</ol>
          </div>
        </section>

        <section class="fe-section fe-partnership" aria-labelledby="fe-partnership-title">
          <div class="wrap fe-partnership-grid og-reveal">
            <div class="fe-partnership-copy">
              <p class="fe-section-label">Integração institucional</p>
              <h2 id="fe-partnership-title">Uma realização construída em parceria</h2>
              ${s.partnership.map(text=>`<p>${escape(text)}</p>`).join('')}
              <ul class="fe-partners" aria-label="Instituições participantes">${post.partners.map(partner=>`<li>${escape(partner)}</li>`).join('')}</ul>
            </div>
            <div class="fe-partnership-media">
              ${picture(image('reuniao-organizacao.webp'))}
              ${picture(image('equipe-parcerias.webp'))}
            </div>
          </div>
        </section>

        <section class="fe-section fe-results" aria-labelledby="fe-results-title">
          <div class="wrap fe-results-grid og-reveal">
            ${picture(image('publico-atendimentos.webp'),'fe-results-photo')}
            <div class="fe-results-copy">
              <p class="fe-section-label">Impacto direto</p>
              <h2 id="fe-results-title">Resultados para o município</h2>
              ${s.results.map(text=>`<p>${escape(text)}</p>`).join('')}
              <p class="fe-results-note">As conexões criadas durante o evento ampliaram o acesso da população ao emprego, à renda e aos serviços públicos.</p>
            </div>
          </div>
        </section>

        <section class="fe-section fe-gallery-section" aria-labelledby="fe-gallery-title">
          <div class="wrap og-reveal">
            <p class="fe-section-label">Registro do evento</p>
            <h2 id="fe-gallery-title">Confira como foi o 3º Feirão do Emprego</h2>
            <p class="fe-gallery-intro">Atendimentos, orientação, participação popular e o trabalho conjunto das equipes durante os dois dias de programação.</p>
            <div class="fe-gallery">${gallery}</div>
          </div>
        </section>

        <section class="fe-closing" aria-labelledby="fe-closing-title">
          <div class="fe-reading og-reveal">
            <p class="fe-section-label">Desenvolvimento local</p>
            <h2 id="fe-closing-title">Trabalho e oportunidade mais próximos de quem precisa</h2>
            <p>${escape(s.closing)}</p>
            <p class="fe-source">${escape(post.source_label)}</p>
            <div class="fe-actions"><a class="btn fe-secondary" href="/blog.html">← Voltar para todas as notícias</a><button class="btn" id="share-article" type="button">Compartilhar notícia <span aria-hidden="true">↗</span></button></div>
            <p class="og-toast" id="share-toast" role="status" aria-live="polite"></p>
          </div>
        </section>
      </div>

      <div class="og-lightbox" id="event-lightbox" role="dialog" aria-modal="true" aria-labelledby="lightbox-title" hidden>
        <h2 class="sr-only" id="lightbox-title">Galeria ampliada do 3º Feirão do Emprego</h2>
        <button class="og-lightbox-close" type="button" aria-label="Fechar galeria">×</button>
        <button class="og-lightbox-nav og-lightbox-prev" type="button" aria-label="Imagem anterior">←</button>
        <figure><img alt=""><figcaption><span id="lightbox-caption"></span><b id="lightbox-counter" aria-live="polite"></b></figcaption></figure>
        <button class="og-lightbox-nav og-lightbox-next" type="button" aria-label="Próxima imagem">→</button>
      </div>`;
    initEditorial();
  }

  function renderReligiousEditorial(){
    const s=post.sections;
    const readingTime=post.reading_time||APP.readingTime(post.content);
    const card=(index,className='')=>{const image=post.gallery[index];return `<button class="tr-photo ${className}" type="button" data-lightbox-index="${index}" aria-label="Ampliar imagem: ${escape(image.alt)}"><figure><img src="${escape(image.url)}" alt="${escape(image.alt)}" width="${image.width}" height="${image.height}" loading="lazy" decoding="async"><figcaption>${escape(image.caption)}</figcaption></figure></button>`};
    const heroNames=['Balão da Santa','Via-Sacra','Arraiá da Imaculada'];
    const heroMosaic=post.hero.map((image,index)=>`<figure class="tr-hero-panel"><img src="${escape(image.url)}" alt="${escape(image.alt)}" width="${image.width}" height="${image.height}" ${index===0?'fetchpriority="high"':'loading="eager"'} decoding="async"><figcaption>${heroNames[index]}</figcaption></figure>`).join('');
    const finalGallery=post.finalGallery.map(index=>card(index,'tr-final-photo')).join('');

    article.className='article tr-article';
    document.body.classList.add('religious-post');
    article.innerHTML=`
      <header class="tr-hero">
        <div class="tr-hero-background" aria-hidden="true">
          <img src="${escape(post.video.poster)}" alt="" width="${post.video.posterWidth}" height="${post.video.posterHeight}">
          <video autoplay muted loop playsinline preload="metadata" poster="${escape(post.video.poster)}" tabindex="-1">
            <source src="${escape(post.video.url)}" type="video/mp4">
          </video>
        </div>
        <div class="wrap tr-hero-inner">
          <nav class="breadcrumb" aria-label="Navegação estrutural"><a href="/">Início</a><span>/</span><a href="/blog.html">Notícias</a><span>/</span><span aria-current="page">Turismo religioso</span></nav>
          <div class="tr-hero-copy">
            <p class="tr-kicker">${escape(post.category)}</p>
            <h1>${escape(post.title)}</h1>
            <p class="tr-deck">${escape(post.excerpt)}</p>
            <div class="tr-meta"><span>${readingTime} min de leitura</span><span>${escape(post.location)}</span></div>
          </div>
          <div class="tr-hero-mosaic" role="region" tabindex="0" aria-label="Três manifestações religiosas e culturais de Cidade Ocidental">${heroMosaic}</div>
          <a class="tr-scroll" href="#fe-e-cultura">Conheça as manifestações <span aria-hidden="true">↓</span></a>
        </div>
      </header>

      <div class="tr-story">
        <section class="tr-section tr-intro" id="fe-e-cultura" aria-labelledby="tr-intro-title">
          <div class="tr-reading og-reveal">
            <p class="tr-section-label">Identidade local</p>
            <h2 id="tr-intro-title">Fé que também movimenta a cultura e o turismo</h2>
            ${s.intro.map(text=>`<p>${escape(text)}</p>`).join('')}
          </div>
        </section>

        <section class="tr-video-section" aria-labelledby="tr-video-title">
          <div class="wrap tr-video-inner og-reveal">
            <div class="tr-video-heading">
              <p class="tr-section-label">Registro em vídeo</p>
              <h2 id="tr-video-title">${escape(post.video.title)}</h2>
              <p>${escape(post.video.description)}</p>
            </div>
            <figure class="tr-video-figure">
              <video controls playsinline preload="metadata" poster="${escape(post.video.poster)}" width="1280" height="720" aria-label="${escape(post.video.title)}">
                <source src="${escape(post.video.url)}" type="video/mp4">
                Seu navegador não oferece suporte à reprodução deste vídeo.
              </video>
              <figcaption>${escape(post.video.caption)}</figcaption>
            </figure>
          </div>
        </section>

        <section class="tr-section tr-balao" aria-labelledby="tr-balao-title">
          <div class="wrap tr-feature-grid og-reveal">
            <div class="tr-copy">
              <p class="tr-section-label">Praça Nossa Senhora das Graças</p>
              <h2 id="tr-balao-title">Balão da Santa: devoção transformada em referência da cidade</h2>
              ${s.balao.map(text=>`<p>${escape(text)}</p>`).join('')}
            </div>
            <div class="tr-balao-gallery" aria-label="Galeria do Balão da Santa">
              ${card(0,'tr-photo-main')}
              ${card(2,'tr-photo-small')}
              ${card(3,'tr-photo-small')}
              ${card(1,'tr-photo-wide')}
            </div>
          </div>
        </section>

        <section class="tr-section tr-via" aria-labelledby="tr-via-title">
          <div class="wrap og-reveal">
            <div class="tr-copy tr-copy-light">
              <p class="tr-section-label">Expressão de fé e arte</p>
              <h2 id="tr-via-title">Via-Sacra: fé, reflexão e participação da comunidade</h2>
              ${s.viaSacra.map(text=>`<p>${escape(text)}</p>`).join('')}
            </div>
            <div class="tr-via-gallery" aria-label="Galeria da representação da Via-Sacra">
              ${card(7,'tr-via-scene')}
              ${card(5,'tr-via-cross')}
              ${card(4,'tr-via-portrait')}
              ${card(6,'tr-via-portrait')}
              ${card(8,'tr-via-portrait')}
            </div>
          </div>
        </section>

        <section class="tr-section tr-arraia" aria-labelledby="tr-arraia-title">
          <div class="wrap og-reveal">
            <div class="tr-copy tr-copy-wide">
              <p class="tr-section-label">Cultura e convivência</p>
              <h2 id="tr-arraia-title">Arraiá da Imaculada: tradição, alegria e convivência</h2>
              ${s.arraia.map(text=>`<p>${escape(text)}</p>`).join('')}
            </div>
            <div class="tr-arraia-gallery" aria-label="Galeria do Arraiá do Jardim da Imaculada">
              ${card(9,'tr-arraia-montage')}
              ${card(10,'tr-arraia-montage')}
              ${card(11,'tr-arraia-montage')}
              ${card(12,'tr-arraia-portrait')}
              ${card(13,'tr-arraia-portrait')}
            </div>
          </div>
        </section>

        <aside class="tr-history" aria-labelledby="tr-history-title">
          <div class="tr-reading og-reveal">
            <p class="tr-section-label">Jardim da Imaculada</p>
            <h2 id="tr-history-title">Um patrimônio religioso de Cidade Ocidental</h2>
            ${s.history.map(text=>`<p>${escape(text)}</p>`).join('')}
          </div>
        </aside>

        <section class="tr-section tr-final-gallery-section" aria-labelledby="tr-final-gallery-title">
          <div class="wrap og-reveal">
            <p class="tr-section-label">Memória visual</p>
            <h2 id="tr-final-gallery-title">Fé e tradição em imagens</h2>
            <p class="tr-gallery-intro">Outros registros que revelam os detalhes, os encontros e a participação comunitária presentes nessas manifestações.</p>
            <div class="tr-final-gallery">${finalGallery}</div>
          </div>
        </section>

        <section class="tr-closing" aria-labelledby="tr-closing-title">
          <div class="tr-reading og-reveal">
            <p class="tr-section-label">Pertencimento</p>
            <h2 id="tr-closing-title">Uma identidade construída pela fé e pela comunidade</h2>
            ${s.closing.map(text=>`<p>${escape(text)}</p>`).join('')}
            <blockquote class="tr-highlight"><p>${escape(post.highlight)}</p></blockquote>
            <p class="tr-source">${escape(post.source_label)}</p>
            <div class="tr-actions"><a class="btn tr-secondary" href="/blog.html">← Voltar para todas as notícias</a><button class="btn" id="share-article" type="button">Compartilhar notícia <span aria-hidden="true">↗</span></button></div>
            <p class="og-toast" id="share-toast" role="status" aria-live="polite"></p>
          </div>
        </section>
      </div>

      <div class="og-lightbox" id="event-lightbox" role="dialog" aria-modal="true" aria-labelledby="lightbox-title" hidden>
        <h2 class="sr-only" id="lightbox-title">Galeria ampliada de fé e tradição em Cidade Ocidental</h2>
        <button class="og-lightbox-close" type="button" aria-label="Fechar galeria">×</button>
        <button class="og-lightbox-nav og-lightbox-prev" type="button" aria-label="Imagem anterior">←</button>
        <figure><img alt=""><figcaption><span id="lightbox-caption"></span><b id="lightbox-counter" aria-live="polite"></b></figcaption></figure>
        <button class="og-lightbox-nav og-lightbox-next" type="button" aria-label="Próxima imagem">→</button>
      </div>`;
    initEditorial();
  }

  function initEditorial(){
    document.body.classList.add('editorial-post');
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const reveals=[...article.querySelectorAll('.og-reveal')];
    if(reduced.matches||!('IntersectionObserver'in window))reveals.forEach(element=>element.classList.add('is-visible'));
    else{const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.08,rootMargin:'0px 0px -40px'});reveals.forEach(element=>observer.observe(element))}

    const counters=[...article.querySelectorAll('[data-count-target]')];
    const setCounter=(element,value)=>{const formatted=element.dataset.countFormat?Number(value).toLocaleString(element.dataset.countFormat):value;element.textContent=`${element.dataset.countPrefix||''}${formatted}${element.dataset.countSuffix||''}`};
    const animateCounter=element=>{const target=Number(element.dataset.countTarget);if(reduced.matches){setCounter(element,target);return}const start=performance.now(),duration=850;const tick=now=>{const progress=Math.min((now-start)/duration,1),eased=1-Math.pow(1-progress,3);setCounter(element,Math.round(target*eased));if(progress<1)requestAnimationFrame(tick)};requestAnimationFrame(tick)};
    if(reduced.matches||!('IntersectionObserver'in window))counters.forEach(animateCounter);
    else{const counterObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){animateCounter(entry.target);counterObserver.unobserve(entry.target)}}),{threshold:.6});counters.forEach(element=>counterObserver.observe(element))}

    const lightbox=article.querySelector('#event-lightbox'),lightboxImage=lightbox.querySelector('img'),caption=lightbox.querySelector('#lightbox-caption'),counter=lightbox.querySelector('#lightbox-counter');
    const galleryButtons=[...article.querySelectorAll('[data-lightbox-index]')];
    let current=0,lastTrigger=null,lockedScroll=0;
    const show=index=>{current=(index+post.gallery.length)%post.gallery.length;const image=post.gallery[current];lightboxImage.src=image.url;lightboxImage.alt=image.alt;caption.textContent=image.caption;counter.textContent=`${current+1} de ${post.gallery.length}`};
    const open=(index,trigger)=>{lastTrigger=trigger||document.activeElement;lockedScroll=scrollY;show(index);lightbox.hidden=false;document.body.classList.add('lightbox-open');document.body.style.top=`-${lockedScroll}px`;lightbox.querySelector('.og-lightbox-close').focus()};
    const close=()=>{if(lightbox.hidden)return;lightbox.hidden=true;document.body.classList.remove('lightbox-open');document.body.style.top='';scrollTo(0,lockedScroll);lastTrigger?.focus({preventScroll:true})};
    galleryButtons.forEach(button=>button.addEventListener('click',()=>open(Number(button.dataset.lightboxIndex),button)));
    lightbox.querySelector('.og-lightbox-close').addEventListener('click',close);
    lightbox.querySelector('.og-lightbox-prev').addEventListener('click',()=>show(current-1));
    lightbox.querySelector('.og-lightbox-next').addEventListener('click',()=>show(current+1));
    lightbox.addEventListener('click',event=>{if(event.target===lightbox)close()});
    lightbox.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close()}else if(event.key==='ArrowLeft'){event.preventDefault();show(current-1)}else if(event.key==='ArrowRight'){event.preventDefault();show(current+1)}else if(event.key==='Tab'){const controls=[...lightbox.querySelectorAll('button')],first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}});

    const toast=article.querySelector('#share-toast'),shareButton=article.querySelector('#share-article');
    const notify=message=>{toast.textContent=message;toast.classList.add('is-visible');clearTimeout(notify.timer);notify.timer=setTimeout(()=>toast.classList.remove('is-visible'),2800)};
    const copyAddress=async()=>{if(navigator.clipboard&&isSecureContext)await navigator.clipboard.writeText(canonical);else{const field=document.createElement('textarea');field.value=canonical;field.setAttribute('readonly','');field.style.position='fixed';field.style.opacity='0';document.body.append(field);field.select();const copied=document.execCommand('copy');field.remove();if(!copied)throw new Error('copy failed')}notify('Endereço da notícia copiado.')};
    shareButton.addEventListener('click',async()=>{try{if(navigator.share)await navigator.share({title:post.title,text:post.excerpt,url:canonical});else await copyAddress()}catch(error){if(error.name!=='AbortError'){try{await copyAddress()}catch{notify('Não foi possível compartilhar agora.')}}}});
  }

  function renderDefault(){
    const gallery=Array.isArray(post.gallery)&&post.gallery.length?`<div class="article-gallery">${post.gallery.map(image=>`<img src="${escape(image.url||image)}" alt="${escape(image.alt||post.title)}" loading="lazy">`).join('')}</div>`:'';
    const meta=[post.published_at?`<time datetime="${escape(post.published_at)}">${APP.formatDate(post.published_at)}</time>`:'',`<span>${post.reading_time||APP.readingTime(post.content)} min de leitura</span>`].filter(Boolean).join('');
    article.innerHTML=`<header class="article-head"><div class="wrap"><nav class="breadcrumb" aria-label="Navegação estrutural"><a href="/">Início</a><span>/</span><a href="/blog.html">Notícias</a><span>/</span><span aria-current="page">${escape(post.title)}</span></nav><p class="eyebrow">${escape(post.category)}</p><h1>${escape(post.title)}</h1><p class="article-lead">${escape(post.excerpt)}</p><div class="article-meta">${meta}</div></div></header><div class="wrap article-shell"><img class="article-cover" src="${escape(post.cover_url||APP.fallbackImage)}" alt="${escape(post.cover_alt||post.title)}"><div class="article-content">${APP.renderMarkdown(post.content)}</div>${gallery}${post.source_name?`<p class="article-source">Fonte: ${escape(post.source_name)}</p>`:post.source_url?'<p class="article-source">Referência editorial arquivada: publicação pública no perfil oficial.</p>':''}<a class="btn" href="/blog.html">← Voltar ao blog</a></div>`;
  }

  if(post.layout==='ocidental-gastro')renderEditorial();else if(post.layout==='feirao-emprego')renderEmploymentEditorial();else if(post.layout==='turismo-religioso')renderReligiousEditorial();else renderDefault();
  status.hidden=true;article.hidden=false;
  if(!localPost)APP.api(`/api/posts/${encodeURIComponent(post.slug)}/view`,{method:'POST'}).catch(()=>{});
  if(!localPost)try{const response=await APP.api('/api/posts?status=published'),related=Array.isArray(response)?response.filter(item=>item.id!==post.id&&item.category===post.category).slice(0,3):[];if(related.length){document.querySelector('#related').hidden=false;document.querySelector('#related-grid').innerHTML=related.map(item=>`<article><img src="${escape(item.cover_url||APP.fallbackImage)}" alt="${escape(item.cover_alt||item.title)}" loading="lazy"><span>${escape(item.category)}</span><h3><a href="/post.html?slug=${encodeURIComponent(item.slug)}">${escape(item.title)}</a></h3></article>`).join('')}}catch{}
})();
