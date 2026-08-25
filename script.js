const data=window.SITE_DATA||{};
const header=document.querySelector('.header');
const menu=document.querySelector('.menu');
const nav=document.querySelector('#nav');
const topButton=document.querySelector('.top');
const navLinks=[...nav.querySelectorAll('a')];
const sections=navLinks.map(a=>document.querySelector(a.hash)).filter(Boolean);

function closeMenu(){nav.classList.remove('open');header.classList.remove('menu-active');menu.setAttribute('aria-expanded','false');document.body.classList.remove('menu-open')}
menu.addEventListener('click',()=>{const open=!nav.classList.contains('open');nav.classList.toggle('open',open);header.classList.toggle('menu-active',open);menu.setAttribute('aria-expanded',String(open));document.body.classList.toggle('menu-open',open)});
navLinks.forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});

function onScroll(){const y=scrollY;header.classList.toggle('scrolled',y>40);topButton.classList.toggle('visible',y>700);let current='';sections.forEach(s=>{if(y>=s.offsetTop-180)current=s.id});navLinks.forEach(a=>a.classList.toggle('active',a.hash===`#${current}`));if(!matchMedia('(prefers-reduced-motion: reduce)').matches){const portrait=document.querySelector('.portrait-frame');if(portrait)portrait.style.transform=`translateY(${Math.min(y*.035,22)}px)`}}
addEventListener('scroll',onScroll,{passive:true});onScroll();topButton.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));

const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(reduced)document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'));
else{const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.12});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el))}

document.querySelectorAll('.flag-track button').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.flag-track button').forEach(b=>b.classList.remove('active'));button.classList.add('active');document.querySelector('.flag-copy').textContent=button.dataset.copy}));

const form=document.querySelector('#formulario');
const errors={nome:'Informe seu nome.',telefone:'Informe seu telefone.',bairro:'Informe seu bairro.',assunto:'Informe o assunto.',mensagem:'Escreva sua mensagem.'};
function validate(){let valid=true;form.querySelectorAll('.input').forEach(group=>{const field=group.querySelector('input,textarea');const empty=!field.value.trim();group.classList.toggle('invalid',empty);group.querySelector('small').textContent=empty?errors[field.name]:'';if(empty)valid=false});const consent=form.elements.consentimento.checked;form.querySelector('.consent-error').textContent=consent?'':'É necessário autorizar o tratamento dos dados.';return valid&&consent}
form.addEventListener('input',e=>{const group=e.target.closest('.input');if(group&&e.target.value.trim()){group.classList.remove('invalid');group.querySelector('small').textContent=''}});
form.addEventListener('submit',e=>{e.preventDefault();const status=form.querySelector('.form-status');status.className='form-status full';status.textContent='';if(!validate()){form.querySelector('.invalid input,.invalid textarea')?.focus();return}if(!data.formEndpoint){status.classList.add('notice');status.textContent='Mensagem ainda não enviada: a integração de recebimento precisa ser configurada pela equipe do mandato.';return}status.classList.add('notice');status.textContent='A integração está cadastrada, mas o envio deve ser conectado ao serviço definido.'});
document.querySelector('#year').textContent=new Date().getFullYear();
