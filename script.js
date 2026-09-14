document.documentElement.classList.add('has-js');
const data=window.SITE_DATA||{};
const header=document.querySelector('.header');
const menu=document.querySelector('.menu');
const nav=document.querySelector('#nav');
const topButton=document.querySelector('.top');
let lastFocus=null,scrollPending=false;
const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
const mobileQuery=matchMedia('(max-width:1000px)');
const portrait=document.querySelector('.portrait-frame');
const navLinks=nav?[...nav.querySelectorAll(':scope > a')]:[];
const sections=navLinks.map(a=>a.hash?document.querySelector(a.hash):null).filter(Boolean);
const scrim=document.createElement('button');
scrim.type='button';scrim.tabIndex=-1;scrim.className='menu-scrim';scrim.setAttribute('aria-label','Fechar menu');
if(nav)document.body.append(scrim);
function focusables(){return nav?[...nav.querySelectorAll(':scope > a'),menu].filter(Boolean):[]}
function closeMenu(returnFocus=true){if(!nav||!menu)return;nav.classList.remove('open');scrim.classList.remove('open');header?.classList.remove('menu-active');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Abrir menu');document.body.classList.remove('menu-open');nav.inert=mobileQuery.matches;if(returnFocus&&lastFocus)lastFocus.focus({preventScroll:true})}
function openMenu(){if(!nav||nav.classList.contains('open'))return;lastFocus=menu;nav.inert=false;nav.classList.add('open');scrim.classList.add('open');header?.classList.add('menu-active');menu.setAttribute('aria-expanded','true');menu.setAttribute('aria-label','Fechar menu');document.body.classList.add('menu-open');requestAnimationFrame(()=>{if(nav.classList.contains('open'))navLinks[0]?.focus({preventScroll:true})})}
menu?.addEventListener('click',()=>nav.classList.contains('open')?closeMenu():openMenu());
scrim.addEventListener('click',()=>closeMenu());
navLinks.forEach(a=>a.addEventListener('click',()=>closeMenu(false)));
document.addEventListener('keydown',e=>{if(!nav?.classList.contains('open'))return;if(e.key==='Escape'){e.preventDefault();closeMenu();return}if(e.key==='Tab'){const items=focusables(),first=items[0],last=items.at(-1);if(!items.includes(document.activeElement)){e.preventDefault();(e.shiftKey?last:first)?.focus()}else if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
mobileQuery.addEventListener('change',()=>{closeMenu(false);if(portrait)portrait.style.transform=''});closeMenu(false);
let sectionOffsets=[];
function measureSections(){sectionOffsets=sections.map(s=>({id:s.id,top:s.getBoundingClientRect().top+scrollY}));scheduleScroll()}
function onScroll(){
  scrollPending=false;const y=scrollY;
  header?.classList.toggle('scrolled',y>40||document.body.classList.contains('blog-page'));
  topButton?.classList.toggle('visible',y>700&&!document.activeElement?.matches('input,textarea,select'));
  let current='';sectionOffsets.forEach(s=>{if(y>=s.top-180)current=s.id});
  navLinks.forEach(a=>a.classList.toggle('active',Boolean(a.hash)&&a.hash===`#${current}`));
  if(portrait&&!mobileQuery.matches&&!motionQuery.matches&&y<innerHeight)portrait.style.transform=`translateY(${Math.min(y*.035,22)}px)`;
}

// Alterna a reação do personagem conforme a seção em destaque.
const communityCharacter=document.querySelector('.community-character');
if(communityCharacter){
  const reactions=['character-point.png','character-wave.png','character-idea.png','character-like.png'];
  const sections=[...document.querySelectorAll('main section')];
  const updateReaction=index=>{const reaction=reactions[index%reactions.length];communityCharacter.classList.add('is-changing');setTimeout(()=>{communityCharacter.src=`assets/photos/${reaction}`;communityCharacter.dataset.reaction=reaction;communityCharacter.classList.remove('is-changing')},140)};
  const observer=new IntersectionObserver(entries=>{const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(visible)updateReaction(sections.indexOf(visible.target))},{threshold:[.35,.6,.8]});
  sections.forEach(section=>observer.observe(section));
}
function scheduleScroll(){if(!scrollPending){scrollPending=true;requestAnimationFrame(onScroll)}}
addEventListener('scroll',scheduleScroll,{passive:true});addEventListener('resize',measureSections,{passive:true});
addEventListener('load',measureSections,{once:true});document.fonts?.ready.then(measureSections);measureSections();
document.addEventListener('focusin',scheduleScroll);document.addEventListener('focusout',scheduleScroll);
topButton?.addEventListener('click',()=>scrollTo({top:0,behavior:motionQuery.matches?'auto':'smooth'}));
let revealObserver;
function revealAll(){revealObserver?.disconnect();document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'));if(portrait)portrait.style.transform=''}
if(motionQuery.matches||!('IntersectionObserver' in window))revealAll();
else{
  revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');revealObserver.unobserve(entry.target)}}),{threshold:.08});
  document.querySelectorAll('.reveal').forEach(el=>revealObserver.observe(el));
}
motionQuery.addEventListener('change',e=>{if(e.matches)revealAll()});
document.querySelectorAll('.flag-track button').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.flag-track button').forEach(b=>b.classList.remove('active'));button.classList.add('active');document.querySelector('.flag-copy').textContent=button.dataset.copy}));
const form=document.querySelector('#formulario'),errors={nome:'Informe seu nome.',telefone:'Informe seu telefone.',bairro:'Informe seu bairro.',assunto:'Informe o assunto.',mensagem:'Escreva sua mensagem.'};
if(form){function validate(){let valid=true;form.querySelectorAll('.input').forEach(group=>{const field=group.querySelector('input,textarea'),empty=!field.value.trim();group.classList.toggle('invalid',empty);group.querySelector('small').textContent=empty?errors[field.name]:'';if(empty)valid=false});const consent=form.elements.consentimento.checked;form.querySelector('.consent-error').textContent=consent?'':'É necessário autorizar o tratamento dos dados.';return valid&&consent}form.addEventListener('input',e=>{const group=e.target.closest('.input');if(group&&e.target.value.trim()){group.classList.remove('invalid');group.querySelector('small').textContent=''}});form.addEventListener('submit',e=>{e.preventDefault();const status=form.querySelector('.form-status');status.className='form-status full';status.textContent='';if(!validate()){form.querySelector('.invalid input,.invalid textarea')?.focus();return}status.classList.add('notice');status.textContent=data.formEndpoint?'A integração está cadastrada, mas o envio deve ser conectado ao serviço definido.':'Mensagem ainda não enviada: a integração de recebimento precisa ser configurada pela equipe do mandato.'})}
const year=document.querySelector('#year');if(year)year.textContent=new Date().getFullYear();
const albumImage=document.querySelector('#album-image');
if(albumImage){
  const album=albumImage.closest('.album-carousel'),label=document.querySelector('#album-page');
  const pages=[['01-capa.webp','Capa'],['02-patrimonio.webp','Patrimônio, cultura e identidade'],['03-parcerias.webp','Parcerias que geram resultados'],['04-oportunidades.webp','Desenvolvimento, esporte e oportunidades']];
  let current=0,requested=0,requestId=0,startTouch=null,transition;
  const cache=new Map();
  function prepare(index){
    if(!cache.has(index)){const img=new Image();img.src=`assets/photos/album/${pages[index][0]}`;cache.set(index,img.decode().then(()=>img).catch(error=>{cache.delete(index);throw error}))}
    return cache.get(index);
  }
  async function change(delta){
    requested=(requested+delta+pages.length)%pages.length;const index=requested,id=++requestId;
    try{
      const img=await prepare(index);if(id!==requestId)return;
      current=index;albumImage.src=img.src;albumImage.alt=`Página ${index+1}: ${pages[index][1]}`;
      label.textContent=String(index+1).padStart(2,'0');
      transition?.cancel();if(!motionQuery.matches)transition=albumImage.animate([{opacity:.35},{opacity:1}],{duration:240,easing:'ease-out'});
      prepare((index+1)%pages.length).catch(()=>{});
    }catch{if(id===requestId){requested=current;label.textContent=String(current+1).padStart(2,'0')}}
  }
  document.querySelector('#album-prev')?.addEventListener('click',()=>change(-1));
  document.querySelector('#album-next')?.addEventListener('click',()=>change(1));
  album.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();change(e.key==='ArrowRight'?1:-1)}});
  const frame=album.querySelector('.album-frame');
  frame.addEventListener('touchstart',e=>{startTouch=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null},{passive:true});
  frame.addEventListener('touchend',e=>{if(!startTouch)return;const dx=e.changedTouches[0].clientX-startTouch.x,dy=e.changedTouches[0].clientY-startTouch.y;startTouch=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3)change(dx<0?1:-1)},{passive:true});
  frame.addEventListener('touchcancel',()=>{startTouch=null},{passive:true});
  if('IntersectionObserver' in window){const preload=new IntersectionObserver(items=>{if(items.some(i=>i.isIntersecting)){prepare(1).catch(()=>{});preload.disconnect()}},{rootMargin:'200px'});preload.observe(album)}
}

// Ajustes de conteúdo e experiência da página inicial.
if(document.body && !document.body.classList.contains('blog-page')){
  const score=document.querySelector('.score div:last-child');if(score)score.innerHTML='<strong>15</strong><span>leis aprovadas</span>';
  const career=document.querySelectorAll('.career h3');if(career[0])career[0].textContent='Secretário de Governo';if(career[2])career[2].textContent='Secretário industrial, comércio e trabalho';
  const links=['feirao-do-emprego-aproxima-trabalhadores-e-empresas','ocidental-gastro-movimenta-comercio-cultura-e-turismo','experiencia-e-preparo-para-transformar-ideias-em-resultados','ocidental-gastro-movimenta-comercio-cultura-e-turismo','ocidental-gastro-movimenta-comercio-cultura-e-turismo','protecao-bandeira-brasao-identidade-cidade-ocidental','protecao-bandeira-brasao-identidade-cidade-ocidental'];
  document.querySelectorAll('.bento-card').forEach((card,i)=>{if(links[i]){card.setAttribute('role','link');card.tabIndex=0;const go=()=>location.href=`post.html?slug=${links[i]}`;card.addEventListener('click',go);card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}})}});
}
