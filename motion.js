// Camada de movimento: animações de entrada, parallax, contadores e interações com o cursor.
(()=>{
  const root=document.documentElement;
  const reduceQuery=matchMedia('(prefers-reduced-motion: reduce)');
  const fineQuery=matchMedia('(hover:hover) and (pointer:fine)');
  const mobileQuery=matchMedia('(max-width:720px)');
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

  // Barra de progresso de leitura (útil mesmo com movimento reduzido).
  const progress=document.createElement('div');
  progress.className='scroll-progress';progress.setAttribute('aria-hidden','true');
  document.body.append(progress);

  if(reduceQuery.matches){root.classList.remove('motion-ready')}
  else root.classList.add('motion-ready');
  reduceQuery.addEventListener('change',e=>root.classList.toggle('motion-ready',!e.matches));
  const motionOn=()=>!reduceQuery.matches;

  // Divide o texto em palavras sem perder elementos internos (em, span, etc.).
  function splitWords(element,className,skip){
    const words=[];
    const walk=node=>[...node.childNodes].forEach(child=>{
      if(child.nodeType===Node.TEXT_NODE){
        if(!child.textContent.trim())return;
        const fragment=document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(part=>{
          if(!part)return;
          if(!part.trim()){fragment.append(part);return}
          const word=document.createElement('span');
          word.className=className;word.textContent=part;
          fragment.append(word);words.push(word);
        });
        child.replaceWith(fragment);
      }else if(child.nodeType===Node.ELEMENT_NODE&&!(skip&&child.matches(skip)))walk(child);
    });
    walk(element);
    return words;
  }

  // Abertura do hero: título palavra por palavra.
  const hero=document.querySelector('.hero');
  const heroTitle=hero?.querySelector('h1');
  if(heroTitle){
    heroTitle.setAttribute('aria-label',heroTitle.textContent.trim().replace(/\s+/g,' '));
    splitWords(heroTitle,'w').forEach((word,index)=>{
      const inner=document.createElement('span');
      inner.textContent=word.textContent;inner.style.setProperty('--i',index);
      word.textContent='';word.setAttribute('aria-hidden','true');word.append(inner);
    });
    heroTitle.classList.add('is-split');
  }

  // Faixa em movimento reage à velocidade e à direção da rolagem.
  const tickerTrack=document.querySelector('.ticker__track');
  let tickerAnimation=null,tickerRate=1,tickerTarget=1;

  // Header, progresso, parallax e texto iluminado são atualizados no mesmo quadro.
  const header=document.querySelector('.header');
  let lastY=scrollY,framePending=false;
  const parallaxItems=[
    ...[...document.querySelectorAll('.back-word,.footer-word')].map(el=>({el,prop:'--px',amount:-140,unit:'px'})),
    ...[...document.querySelectorAll('.art-number,.big-mark,.law-panel>strong')].map(el=>({el,prop:'--py',amount:-50,unit:'px'})),
    ...[...document.querySelectorAll('.circle-word')].map(el=>({el,prop:'--pr',amount:-24,unit:'deg'}))
  ];
  const visibleParallax=new Set();
  if('IntersectionObserver' in window){
    const parallaxObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
      const item=parallaxItems.find(candidate=>candidate.el===entry.target);
      if(item)entry.isIntersecting?visibleParallax.add(item):visibleParallax.delete(item);
    }),{rootMargin:'120px 0px'});
    parallaxItems.forEach(item=>parallaxObserver.observe(item.el));
  }

  const litGroups=[...document.querySelectorAll('.manifesto-title,.position blockquote')].map(el=>({el,words:splitWords(el,'lit-word','footer')}));

  function onFrame(){
    framePending=false;
    const y=scrollY,delta=y-lastY,viewport=innerHeight;
    const max=root.scrollHeight-viewport;
    progress.style.setProperty('--progress',max>0?clamp(y/max,0,1):0);

    if(header&&motionOn()){
      const busy=document.body.classList.contains('menu-open')||header.contains(document.activeElement);
      if(busy||y<520||delta<-6)header.classList.remove('is-hidden');
      else if(delta>8)header.classList.add('is-hidden');
    }
    if(!motionOn()){lastY=y;return}

    if(hero&&y<viewport*1.2)hero.style.setProperty('--sy',`${(y*.28).toFixed(1)}px`);
    visibleParallax.forEach(item=>{
      const rect=item.el.getBoundingClientRect();
      const offset=clamp((rect.top+rect.height/2-viewport/2)/viewport,-1.2,1.2);
      item.el.style.setProperty(item.prop,`${(offset*item.amount).toFixed(1)}${item.unit}`);
    });
    litGroups.forEach(({el,words})=>{
      const rect=el.getBoundingClientRect();
      if(rect.bottom<-viewport||rect.top>viewport*2)return;
      // Começa a acender ao entrar na tela e termina quando o bloco chega ao centro.
      const ratio=clamp((viewport*.9-rect.top)/(rect.height*.7+viewport*.25),0,1);
      const lit=Math.round(ratio*words.length*1.15);
      words.forEach((word,index)=>word.classList.toggle('is-lit',index<lit));
    });
    if(tickerTrack){
      tickerTarget=Math.max(tickerTarget,clamp(1+Math.abs(delta)*.1,1,6));
      animateTicker();
    }
    lastY=y;
  }
  function requestFrame(){if(!framePending){framePending=true;requestAnimationFrame(onFrame)}}
  addEventListener('scroll',requestFrame,{passive:true});
  addEventListener('resize',requestFrame,{passive:true});
  requestFrame();

  let tickerLoop=0;
  function animateTicker(){
    tickerAnimation??=tickerTrack.getAnimations?.()[0]||null;
    if(!tickerAnimation||tickerLoop)return;
    const step=()=>{
      tickerRate+=(tickerTarget-tickerRate)*.12;
      tickerTarget+=(1-tickerTarget)*.05;
      tickerAnimation.playbackRate=tickerRate;
      if(Math.abs(tickerRate-1)>.01||tickerTarget-1>.01)tickerLoop=requestAnimationFrame(step);
      else{tickerLoop=0;tickerRate=tickerTarget=1;tickerAnimation.playbackRate=1}
    };
    tickerLoop=requestAnimationFrame(step);
  }

  if(!('IntersectionObserver' in window))return;

  // Direção de entrada para cada bloco.
  const directions={left:'.legacy-photo,.album-copy,.insta-label,.contact-copy,.law-panel.family,.flags-intro',right:'.legacy-copy,.album-carousel,.insta-card,.citizen-form,.profile-file,.law-panel.history',zoom:'.bento-card,.phones-home-cta__inner,.demand-lookup'};
  Object.entries(directions).forEach(([direction,selector])=>document.querySelectorAll(selector).forEach(el=>{if(el.classList.contains('reveal'))el.dataset.reveal=direction}));

  // Blocos que entram juntos ganham um pequeno atraso em cascata.
  const cascade=new IntersectionObserver(entries=>{
    entries.filter(entry=>entry.isIntersecting)
      .sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top||a.boundingClientRect.left-b.boundingClientRect.left)
      .forEach((entry,index)=>{
        const el=entry.target;cascade.unobserve(el);
        if(!index||el.closest('.hero'))return;
        el.style.transitionDelay=`${Math.min(index,6)*110}ms`;
        setTimeout(()=>{el.style.transitionDelay=''},1600+index*110);
      });
  },{threshold:.08});
  document.querySelectorAll('.reveal:not(.visible)').forEach(el=>cascade.observe(el));

  // Listas cujos itens surgem um a um.
  const staggerObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(!entry.isIntersecting)return;
    entry.target.classList.add('is-in');staggerObserver.unobserve(entry.target);
  }),{threshold:.12,rootMargin:'0px 0px -6% 0px'});
  document.querySelectorAll('.score,.career,.flag-track,.legacy-line,.alo-sanches__steps,.partnership-panels,.partnership-panel__results,.album-badges,.profile-file ul').forEach(group=>{
    group.dataset.stagger='';
    [...group.children].forEach((child,index)=>child.style.setProperty('--i',index));
    staggerObserver.observe(group);
  });

  // Números contam até o valor final quando aparecem.
  function countUp(el,delay){
    const node=[...el.childNodes].find(child=>child.nodeType===Node.TEXT_NODE&&/\d/.test(child.textContent));
    const match=node?.textContent.match(/^(\D*)(\d+)([\s\S]*)$/);
    if(!match||!motionOn())return;
    const [,prefix,digits,suffix]=match,target=Number(digits);
    const width=digits.length>1&&digits.startsWith('0')?digits.length:0;
    const duration=1400+Math.min(target,900)*.6;
    let start=0;
    node.textContent=prefix+'0'.padStart(width,'0')+suffix;
    el.classList.add('is-counting');
    const tick=now=>{
      start||=now;
      const t=clamp((now-start)/duration,0,1),eased=t===1?1:1-Math.pow(2,-10*t);
      node.textContent=prefix+String(Math.round(target*eased)).padStart(width,'0')+suffix;
      if(t<1)requestAnimationFrame(tick);
      else{el.classList.remove('is-counting');el.classList.add('is-counted')}
    };
    setTimeout(()=>requestAnimationFrame(tick),delay);
  }
  const countObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(!entry.isIntersecting)return;
    countObserver.unobserve(entry.target);
    // No hero, espera a abertura terminar antes de contar.
    countUp(entry.target,entry.target.closest('.hero')?1000:0);
  }),{threshold:.6});
  document.querySelectorAll('.score strong,.bento-number strong,.law-panel>strong,.bento-history>span,.flags-count b').forEach(el=>countObserver.observe(el));

  // Interações com o cursor (apenas mouse/trackpad).
  if(!fineQuery.matches)return;

  if(hero){
    const spotlight=document.createElement('div');
    spotlight.className='hero-spotlight';spotlight.setAttribute('aria-hidden','true');
    hero.prepend(spotlight);
    hero.addEventListener('pointermove',event=>{
      if(!motionOn())return;
      const rect=hero.getBoundingClientRect();
      const x=(event.clientX-rect.left)/rect.width,y=(event.clientY-rect.top)/rect.height;
      hero.classList.add('is-pointer');
      hero.style.setProperty('--mx',`${(x*100).toFixed(1)}%`);hero.style.setProperty('--my',`${(y*100).toFixed(1)}%`);
      hero.style.setProperty('--hx',(x-.5).toFixed(3));hero.style.setProperty('--hy',(y-.5).toFixed(3));
    });
    hero.addEventListener('pointerleave',()=>{hero.classList.remove('is-pointer');hero.style.setProperty('--hx',0);hero.style.setProperty('--hy',0)});
  }

  const tiltSelector='.bento-card,.law-panel,.insta-card,.partnership-result,.album-frame';
  const glowSelector=`${tiltSelector},.flags .flag-card,.career-card`;
  document.querySelectorAll(glowSelector).forEach(card=>{
    const glow=document.createElement('span');
    glow.className='card-glow';glow.setAttribute('aria-hidden','true');
    card.append(glow);
    const tilt=card.matches(tiltSelector);
    if(tilt)card.dataset.tilt='';
    card.addEventListener('pointermove',event=>{
      if(!motionOn())return;
      const rect=card.getBoundingClientRect();
      const x=(event.clientX-rect.left)/rect.width,y=(event.clientY-rect.top)/rect.height;
      card.classList.add('is-hovered');
      card.style.setProperty('--mx',`${(x*100).toFixed(1)}%`);card.style.setProperty('--my',`${(y*100).toFixed(1)}%`);
      if(tilt&&!mobileQuery.matches){
        const dx=x-.5,dy=y-.5,angle=Math.hypot(dx,dy)*7;
        card.style.rotate=angle>.05?`${(-dy).toFixed(3)} ${dx.toFixed(3)} 0 ${angle.toFixed(2)}deg`:'';
      }
    });
    card.addEventListener('pointerleave',()=>{card.classList.remove('is-hovered');card.style.rotate=''});
  });

  // Botões levemente atraídos pelo cursor.
  document.querySelectorAll('.btn,.citizen-launcher,.top,.album-controls button').forEach(button=>{
    button.addEventListener('pointermove',event=>{
      if(!motionOn())return;
      const rect=button.getBoundingClientRect();
      const x=event.clientX-rect.left-rect.width/2,y=event.clientY-rect.top-rect.height/2;
      button.style.translate=`${clamp(x*.18,-8,8).toFixed(1)}px ${clamp(y*.28,-6,6).toFixed(1)}px`;
    });
    button.addEventListener('pointerleave',()=>{button.style.translate=''});
  });
})();
