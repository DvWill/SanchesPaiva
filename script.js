const data=window.SITE_DATA||{};
const header=document.querySelector('.header');
const menu=document.querySelector('.menu');
const nav=document.querySelector('#nav');
const topButton=document.querySelector('.top');
let lastFocus=null;
const navLinks=nav?[...nav.querySelectorAll(':scope > a')]:[];
const sections=navLinks.map(a=>a.hash?document.querySelector(a.hash):null).filter(Boolean);
const scrim=document.createElement('button');
scrim.type='button';scrim.className='menu-scrim';scrim.setAttribute('aria-label','Fechar menu');
if(nav)document.body.append(scrim);
function focusables(){return nav?[...nav.querySelectorAll(':scope > a')]:[]}
function closeMenu(returnFocus=true){if(!nav||!menu)return;nav.classList.remove('open');scrim.classList.remove('open');header?.classList.remove('menu-active');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Abrir menu');document.body.classList.remove('menu-open');if(returnFocus&&lastFocus)lastFocus.focus()}
function openMenu(){if(!nav||nav.classList.contains('open'))return;lastFocus=document.activeElement;nav.classList.add('open');scrim.classList.add('open');header?.classList.add('menu-active');menu.setAttribute('aria-expanded','true');menu.setAttribute('aria-label','Fechar menu');document.body.classList.add('menu-open')}
menu?.addEventListener('click',()=>nav.classList.contains('open')?closeMenu():openMenu());
scrim.addEventListener('click',()=>closeMenu());
navLinks.forEach(a=>a.addEventListener('click',()=>closeMenu(false)));
document.addEventListener('keydown',e=>{if(!nav?.classList.contains('open'))return;if(e.key==='Escape'){e.preventDefault();closeMenu();return}if(e.key==='Tab'){const items=focusables(),first=items[0],last=items.at(-1);if(!items.includes(document.activeElement)){e.preventDefault();(e.shiftKey?last:first)?.focus()}else if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
matchMedia('(min-width: 1001px)').addEventListener('change',e=>{if(e.matches)closeMenu(false)});
function onScroll(){const y=scrollY;header?.classList.toggle('scrolled',y>40);topButton?.classList.toggle('visible',y>700);let current='';sections.forEach(s=>{if(y>=s.offsetTop-180)current=s.id});navLinks.forEach(a=>a.classList.toggle('active',a.hash===`#${current}`));if(!matchMedia('(prefers-reduced-motion: reduce)').matches){const portrait=document.querySelector('.portrait-frame');if(portrait)portrait.style.transform=`translateY(${Math.min(y*.035,22)}px)`}}
addEventListener('scroll',onScroll,{passive:true});onScroll();topButton?.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(reduced)document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'));else{const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.12});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el))}
document.querySelectorAll('.flag-track button').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.flag-track button').forEach(b=>b.classList.remove('active'));button.classList.add('active');document.querySelector('.flag-copy').textContent=button.dataset.copy}));
const form=document.querySelector('#formulario'),errors={nome:'Informe seu nome.',telefone:'Informe seu telefone.',bairro:'Informe seu bairro.',assunto:'Informe o assunto.',mensagem:'Escreva sua mensagem.'};
if(form){function validate(){let valid=true;form.querySelectorAll('.input').forEach(group=>{const field=group.querySelector('input,textarea'),empty=!field.value.trim();group.classList.toggle('invalid',empty);group.querySelector('small').textContent=empty?errors[field.name]:'';if(empty)valid=false});const consent=form.elements.consentimento.checked;form.querySelector('.consent-error').textContent=consent?'':'É necessário autorizar o tratamento dos dados.';return valid&&consent}form.addEventListener('input',e=>{const group=e.target.closest('.input');if(group&&e.target.value.trim()){group.classList.remove('invalid');group.querySelector('small').textContent=''}});form.addEventListener('submit',e=>{e.preventDefault();const status=form.querySelector('.form-status');status.className='form-status full';status.textContent='';if(!validate()){form.querySelector('.invalid input,.invalid textarea')?.focus();return}status.classList.add('notice');status.textContent=data.formEndpoint?'A integração está cadastrada, mas o envio deve ser conectado ao serviço definido.':'Mensagem ainda não enviada: a integração de recebimento precisa ser configurada pela equipe do mandato.'})}
const year=document.querySelector('#year');if(year)year.textContent=new Date().getFullYear();
