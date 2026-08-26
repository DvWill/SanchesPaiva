(() => {
  if (location.pathname.startsWith('/blog/')) document.head.insertAdjacentHTML('beforeend','<link rel="stylesheet" href="/post.css">');
  const config = window.SITE_DATA || {};
  const ready = Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase);
  window.APP = {
    configured: ready,
    db: ready ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    }) : null,
    categories: ['Mandato em ação','Projetos e leis','Obras e melhorias','Desenvolvimento econômico','Cultura e turismo','Comunidade e fé','Juventude e oportunidades','Agenda'],
    escape(value='') { const node=document.createElement('span'); node.textContent=String(value); return node.innerHTML; },
    slug(value='') { return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); },
    readingTime(value='') { return Math.max(1, Math.ceil(String(value).trim().split(/\s+/).length / 220)); },
    formatDate(value) { return value ? new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'long',year:'numeric'}).format(new Date(value)) : ''; },
    renderMarkdown(value='') {
      const safe=this.escape(value).replace(/^### (.+)$/gm,'<h3>$1</h3>').replace(/^## (.+)$/gm,'<h2>$1</h2>').replace(/^&gt; (.+)$/gm,'<blockquote>$1</blockquote>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>');
      return safe.split(/\n{2,}/).map(part => /^<(h2|h3|blockquote)/.test(part) ? part : `<p>${part.replace(/\n/g,'<br>')}</p>`).join('');
    },
    fallbackImage: '/assets/og-sanches-paiva.svg'
  };
  if (ready && /^\/blog\/[^/]+\/?$/.test(location.pathname)) {
    let visitor=localStorage.getItem('sanches-visitor-id');
    if(!visitor){visitor=crypto.randomUUID();localStorage.setItem('sanches-visitor-id',visitor)}
    const slug=decodeURIComponent(location.pathname.split('/').filter(Boolean).pop());
    window.APP.db.rpc('record_post_view',{p_slug:slug,p_visitor_id:visitor});
  }
})();
