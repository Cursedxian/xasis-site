(() => {
  'use strict';
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const root=document.documentElement;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const desktop=matchMedia('(min-width: 901px) and (hover: hover)');
  const EASE='cubic-bezier(.16,1,.3,1)';
  const liveAnimations=new Set();
  const headingRecords=new Map();
  const stripRecords=new Map();
  let queued=new WeakSet();
  const pendingPhotos=new Map();
  const ambientTargets=new Set();
  let entryObserver;
  let ambientObserver;
  let initialized=false;
  let frame=0;

  function animate(element,keyframes,options={}) {
    if(reduce.matches||!element?.isConnected)return null;
    const animation=element.animate(keyframes,{duration:650,easing:EASE,fill:'both',...options});
    liveAnimations.add(animation);
    animation.finished.then(()=>liveAnimations.delete(animation),()=>liveAnimations.delete(animation));
    return animation;
  }
  function done(animation,callback) {
    if(!animation){callback?.();return;}
    animation.finished.then(()=>{callback?.();animation.cancel();},()=>{});
  }
  function cancelHeading(element) {
    const record=headingRecords.get(element);
    if(!record)return;
    headingRecords.delete(element);
    for(const animation of record.animations)animation?.cancel();
    element.innerHTML=record.html;
    delete element.dataset.motionWait;
  }
  function revealHeading(element,delay=0) {
    if(reduce.matches)return;
    cancelHeading(element);
    delete element.dataset.motionWait;
    const html=element.innerHTML;
    const lines=html.split(/<br\s*\/?\s*>/i);
    const nodes=lines.map(line=>{
      const mask=document.createElement('span');mask.className='motion-line';
      const inner=document.createElement('span');inner.className='motion-line-inner';inner.innerHTML=line;
      mask.append(inner);return mask;
    });
    element.replaceChildren(...nodes);
    const record={html,animations:[]};headingRecords.set(element,record);
    record.animations=nodes.map((node,index)=>animate(node.firstElementChild,[
      {transform:'translateY(112%)',opacity:.2},
      {transform:'translateY(0)',opacity:1}
    ],{duration:760,delay:delay+index*95}));
    Promise.all(record.animations.map(animation=>animation?.finished.catch(()=>{}))).then(()=>{
      if(headingRecords.get(element)!==record)return;
      headingRecords.delete(element);
      element.innerHTML=html;
      for(const animation of record.animations)animation?.cancel();
    });
  }
  function rise(element,delay=0,kind='rise') {
    delete element.dataset.motionWait;
    element.classList.add(kind==='photo'?'motion-photo-entering':'motion-entering');
    const keyframes=kind==='photo' ? [
      {clipPath:'inset(0 0 17% 0)',opacity:.15},
      {clipPath:'inset(0 0 0% 0)',opacity:1}
    ] : [
      {transform:'translateY(22px)',opacity:0},
      {transform:'translateY(0)',opacity:1}
    ];
    done(animate(element,keyframes,{duration:kind==='photo'?850:650,delay}),()=>element.classList.remove('motion-entering','motion-photo-entering'));
  }
  function cleanStrips(record) {
    if(!record)return;
    stripRecords.delete(record.image);
    record.layer.remove();
    record.image.classList.remove('motion-source-masked');
    record.parent.classList.remove('motion-strips-running');
    for(const animation of record.animations)animation?.cancel();
  }
  async function revealPhoto(image) {
    if(!image||reduce.matches)return;
    cleanStrips(stripRecords.get(image));
    const token=Symbol();
    pendingPhotos.set(image,token);
    const source=image.src;
    const parent=image.parentElement;
    // Keep a complete, usable image if loading fails or the animation is interrupted.
    try{await image.decode();}catch{return;}
    if(reduce.matches||pendingPhotos.get(image)!==token||image.src!==source||!image.isConnected||!image.naturalWidth)return;
    pendingPhotos.delete(image);
    const rect=parent.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    const count=rect.width<600?8:12;
    const layer=document.createElement('div');layer.className='motion-strips';layer.setAttribute('aria-hidden','true');
    // Match a CSS crop of the supplied reference as well as a normal photo.
    const crop=image.classList.contains('reference-source');
    const imageStyle=getComputedStyle(image);
    const ratio=crop?parseFloat(imageStyle.width)/image.naturalWidth:Math.max(rect.width/image.naturalWidth,rect.height/image.naturalHeight);
    const renderedWidth=crop?parseFloat(imageStyle.width):image.naturalWidth*ratio,renderedHeight=crop?parseFloat(imageStyle.height):image.naturalHeight*ratio;
    const position=getComputedStyle(image).objectPosition.split(' ').map(value=>parseFloat(value)/100);
    const offsetX=crop?parseFloat(imageStyle.left):(rect.width-renderedWidth)*(Number.isFinite(position[0])?position[0]:.5);
    const offsetY=crop?parseFloat(imageStyle.top):(rect.height-renderedHeight)*(Number.isFinite(position[1])?position[1]:.5);
    const record={image,parent,layer,animations:[]};
    stripRecords.set(image,record);
    for(let index=0;index<count;index++){
      const strip=document.createElement('div');strip.className='motion-strip';
      const left=rect.width*index/count;
      Object.assign(strip.style,{
        left:`${left}px`,width:`${rect.width/count+1}px`,
        backgroundImage:`url("${image.currentSrc||image.src}")`,
        backgroundSize:`${renderedWidth}px ${renderedHeight}px`,
        backgroundPosition:`${offsetX-left}px ${offsetY}px`
      });
      layer.append(strip);
    }
    parent.append(layer);
    parent.classList.add('motion-strips-running');
    image.classList.add('motion-source-masked');
    record.animations=$$('.motion-strip',layer).map((strip,index)=>animate(strip,[
      {clipPath:'inset(0 49% 0 49%)',opacity:.6},
      {clipPath:'inset(0 0% 0 0%)',opacity:1}
    ],{duration:980,delay:90+index*16}));
    await Promise.all(record.animations.map(animation=>animation?.finished.catch(()=>{})));
    if(stripRecords.get(image)===record)cleanStrips(record);
    queueAmbient();
  }

  function enqueue(element,kind='rise',delay=0) {
    if(!element||queued.has(element))return;
    queued.add(element);
    element.dataset.motionKind=kind;
    element.dataset.motionDelay=String(delay);
    element.dataset.motionWait=kind;
    entryObserver.observe(element);
  }
  function group(selector,stagger=65,kind='rise') {
    const elements=$$(selector);
    elements.forEach((element,index)=>enqueue(element,kind,(index%4)*stagger));
  }
  function queueAmbient(){
    if(frame||reduce.matches||!desktop.matches||!ambientTargets.size)return;
    frame=requestAnimationFrame(()=>{
      frame=0;
      const updates=[];
      for(const element of ambientTargets){
        const rect=element.getBoundingClientRect();
        const progress=Math.max(-1,Math.min(1,(innerHeight/2-(rect.top+rect.height/2))/(innerHeight/2+rect.height/2)));
        updates.push({element,progress});
      }
      for(const {element,progress} of updates){
        if(element.classList.contains('hero-photo')){
          if(element.classList.contains('motion-strips-running'))continue;
          element.style.setProperty('--photo-drift',`${progress*13}px`);
        }else{
          element.style.setProperty('--device-drift',`${progress*9}px`);
          element.style.setProperty('--device-turn',`${progress*.8}deg`);
        }
      }
    });
  }
  function syncAmbient(){
    root.classList.toggle('motion-ambient-desktop',desktop.matches&&!reduce.matches);
    queueAmbient();
  }
  function initialize(){
    if(initialized||reduce.matches||!('IntersectionObserver' in window)||!Element.prototype.animate)return;
    initialized=true;root.classList.add('motion-on');
    entryObserver=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(!entry.isIntersecting)continue;
        const element=entry.target;
        entryObserver.unobserve(element);
        const kind=element.dataset.motionKind;
        const delay=Number(element.dataset.motionDelay)||0;
        if(kind==='heading')revealHeading(element,delay);
        else if(kind==='device'){
          delete element.dataset.motionWait;
          done(animate(element,[
            {translate:'0 24px',rotate:'-3deg',opacity:.2},
            {translate:'0 0',rotate:'0deg',opacity:1}
          ],{duration:1050,delay}),queueAmbient);
        }else rise(element,delay,kind);
      }
    },{threshold:.08,rootMargin:'0px 0px -24px 0px'});
    // Text stays semantic and retains its exact original markup after settling.
    $$('main h1,main h2').forEach(element=>enqueue(element,'heading'));
    group('main .eyebrow',0);
    group('.section-copy > p,.section-copy > .button,.hero-summary,.story-grid > div > p',55);
    group('.about-photo,.service-panels,.contact-form-card,.contact-map iframe,.page-banner-photo',55,'photo');
    group('.accordion-item',60);
    group('.service-tabs [role="tab"]',55);
    group('.step-tile',85);
    group('.project-card',80);
    group('.review-invite,.quote-card,.quote-controls',80);
    group('.blog-card,.team-card',75);
    group('.footer-brand,.footer-links,.footer-hours,.newsletter',60);
    group('.laptop',0,'device');
    // The large photograph gets the recording's most distinctive reveal.
    const heroImage=$('.hero-image');
    if(heroImage)revealPhoto(heroImage);
    ambientObserver=new IntersectionObserver(entries=>{
      for(const entry of entries){if(entry.isIntersecting)ambientTargets.add(entry.target);else ambientTargets.delete(entry.target);}
      queueAmbient();
    });
    $$('.hero-photo,.laptop').forEach(element=>ambientObserver.observe(element));
    syncAmbient();
  }
  function disable(){
    initialized=false;queued=new WeakSet();pendingPhotos.clear();
    entryObserver?.disconnect();ambientObserver?.disconnect();ambientTargets.clear();
    if(frame)cancelAnimationFrame(frame);frame=0;
    for(const animation of liveAnimations)animation.cancel();
    for(const element of [...headingRecords.keys()])cancelHeading(element);
    for(const record of [...stripRecords.values()])cleanStrips(record);
    $$('[data-motion-wait]').forEach(element=>delete element.dataset.motionWait);
    $$('.motion-entering,.motion-photo-entering').forEach(element=>element.classList.remove('motion-entering','motion-photo-entering'));
    root.classList.remove('motion-on','motion-ambient-desktop');
  }
  document.addEventListener('xasis:hero-before',()=>{
    pendingPhotos.delete($('.hero-image'));
    cancelHeading($('#hero-title'));
    cleanStrips(stripRecords.get($('.hero-image')));
  });
  document.addEventListener('xasis:hero-change',()=>{
    if(!initialized||reduce.matches)return;
    revealHeading($('#hero-title'),20);
    const image=$('.hero-image');
    const source=image.src;
    image.decode().then(()=>{
      if(reduce.matches||image.src!==source)return;
      done(animate(image,[{opacity:.3,filter:'blur(2px)'},{opacity:1,filter:'blur(0px)'}],{duration:580}));
    }).catch(()=>{});
  });
  document.addEventListener('xasis:service-change',event=>{
    if(!initialized||reduce.matches)return;
    const panel=document.getElementById(`panel-${event.detail.slug}`);
    if(!panel)return;
    // Cancel only animations inside the panel, leaving page entrances independent.
    for(const element of [panel,...panel.querySelectorAll('*')])for(const animation of element.getAnimations())animation.cancel();
    rise($('.service-photo',panel),0,'photo');
    $$('h3,p,.tick-list,.button',panel).forEach((element,index)=>rise(element,index*45));
  });
  document.addEventListener('xasis:filter-change',()=>{
    if(!initialized||reduce.matches)return;
    $$('.work-grid .project-card:not([hidden])').forEach((element,index)=>{
      for(const animation of element.getAnimations())animation.cancel();
      rise(element,index*55);
    });
  });
  addEventListener('scroll',queueAmbient,{passive:true});
  addEventListener('resize',()=>{
    pendingPhotos.clear();
    // A resize interrupts safely, with complete photos and natural text wrapping.
    for(const record of [...stripRecords.values()])cleanStrips(record);
    for(const element of [...headingRecords.keys()])cancelHeading(element);
    syncAmbient();
  },{passive:true});
  desktop.addEventListener('change',syncAmbient);
  reduce.addEventListener('change',()=>{if(reduce.matches)disable();else initialize();});
  try{initialize();}catch{disable();}
})();
