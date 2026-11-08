// Split from the original single-file build. Logic unchanged; see openspec/changes/migrate-to-solidjs.
import {$,$$,h,rnd,ri,clamp,shuffle,any,gst} from '../core/util.js';
import {ic,spr} from '../core/icons.js';
import {t} from '../core/i18n.js';
import {sfx,buzz} from '../core/audio.js';
import {G,HUD,pop,flash,shakeEl,burstAt,makeCanvas} from '../core/clock.js';
/** Mini-game engines: E[type](stage, cfg, done). */
export const E={};
/* ===================== MINI-GAMES: E[type](stage,cfg,done) → done({stars:0-3,line}) ===================== */
export function field(st,cls){const r=h('div',cls||'field');st.appendChild(r);return r}
export function rel(el){const r=el.getBoundingClientRect(),s=gst.getBoundingClientRect();return[r.left-s.left+r.width/2,r.top-s.top+r.height/2]}
export function segDist(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy,t=l?clamp(((px-ax)*dx+(py-ay)*dy)/l,0,1):0;return Math.hypot(px-ax-t*dx,py-ay-t*dy)}
export function keys(fn){const k=e=>{if(!G.paused&&!$('#modal').classList.contains('on'))fn(e)};addEventListener('keydown',k);G.cleanup=()=>removeEventListener('keydown',k)}

/* 1 · TAP: light diyas / free kings */
E.tap=(st,c,done)=>{
 const F=field(st),T=c.time*1000,t0=G.now(),live=[],gi=ic(c.good),bi=c.bad?ic(c.bad):'';
 let hits=0,miss=0,combo=0,pen=0,iv=c.spawn,next=0,over=false,W=F.clientWidth,H=F.clientHeight;
 G.onResize=()=>{W=F.clientWidth;H=F.clientHeight};
 const sc=()=>HUD.score(`${gi}${hits}/${c.goal}`);sc();
 const kill=(o,cls,ms)=>{o.dead=1;live.splice(live.indexOf(o),1);o.e.classList.add(cls);setTimeout(()=>o.e.remove(),ms||260)};
 const end=win=>{if(over)return;over=true;const acc=Math.round(hits*100/Math.max(1,hits+miss));
  G.later(()=>done({stars:win?(acc>=90?3:acc>=75?2:1):0,line:t('acc',{h:hits,g:c.goal,u:c.unit,a:acc})}),500)};
 function spawn(now){let x,y,k=0;
  do{x=rnd(42,W-42);y=rnd(42,H-70);k++}while(k<12&&live.some(o=>Math.hypot(o.x-x,o.y-y)<80));
  const bad=!!c.bad&&Math.random()<c.badRate,e=h('button','tgt'+(c.dim&&!bad?' dim':''),bad?bi:gi);e.tabIndex=-1;
  e.style.left=x+'px';e.style.top=y+'px';F.appendChild(e);const o={x,y,e,bad,t:now};e._o=o;live.push(o)}
 F.addEventListener('pointerdown',ev=>{const b=ev.target.closest('.tgt'),o=b&&b._o;if(over||G.paused||!o||o.dead)return;
  const gx=o.x,gy=o.y+F.offsetTop;
  if(o.bad){kill(o,'boom');pen+=2000;miss++;combo=0;sfx.bad();buzz(90);flash();shakeEl(F);pop('−2s',gx,gy,'bad');return}
  kill(o,'lit',450);hits++;combo++;sfx.good();buzz(12);burstAt(gx,gy,12);
  if(combo%5===0)pop(t('combo',{n:combo}),gx,gy-34,'good big');else pop('+1',gx,gy);
  sc();if(hits>=c.goal)end(true)});
 G.loop(now=>{if(over)return;const el=now-t0+pen;HUD.time(1-el/T);if(el>=T)return end(false);
  if(now>=next){if(live.length<7)spawn(now);iv=Math.max(c.min,iv-c.accel);next=now+iv}
  for(let i=live.length-1;i>=0;i--){const o=live[i];if(now-o.t>c.life){if(!o.bad){miss++;combo=0}kill(o,'out')}}});
};

/* 2 · SHIELD: hold Govardhan over the village */
E.shield=(st,c,done)=>{
 const F=field(st),K=makeCanvas(F),x=K.ctx,T=c.time*1000,t0=G.now(),drops=[],spl=[];
 let hill=K.W/2,cx=K.W/2,goal=K.W/2,hp=100,blocked=0,next=t0+500,bolt=t0+3500,day=1,last=t0,over=false;
 const hearts=()=>HUD.lives(Math.max(0,Math.ceil(hp/34)));hearts();
 const sc=()=>HUD.score(`${ic('drop')}${t('dayN',{d:day})}`);sc();
 const mv=e=>{const r=K.c.getBoundingClientRect();hill=clamp(e.clientX-r.left,48,K.W-48)};
 K.c.addEventListener('pointerdown',e=>{try{K.c.setPointerCapture(e.pointerId)}catch(_){}mv(e)});
 K.c.addEventListener('pointermove',mv);
 keys(e=>{if(e.key==='ArrowLeft')hill=clamp(hill-40,48,K.W-48);if(e.key==='ArrowRight')hill=clamp(hill+40,48,K.W-48)});
 const fin=(s,line)=>{over=true;G.later(()=>done({stars:s,line}),600)};
 G.loop(now=>{const dt=Math.min(.05,(now-last)/1000);last=now;const W=K.W,H=K.H,el=now-t0,p=clamp(el/T,0,1),hy=H-170,vy=H-34;
  if(!over){HUD.time(1-p);
   const d=Math.min(7,1+Math.floor(p*7));if(d!==day){day=d;sc();pop(t('dayS',{d}),W/2,F.offsetTop+H*.4,'good big')}
   if(el>=T){sfx.win();fin(hp>=80?3:hp>=50?2:1,t('shelter',{b:blocked}))}
   if(Math.abs(goal-cx)<8)goal=rnd(50,W-50);
   cx+=Math.sign(goal-cx)*Math.min(Math.abs(goal-cx),(90+p*170)*dt);
   if(now>=next){drops.push({x:cx+rnd(-34,34),y:70,v:rnd(240,300)*(1+p*.8),b:0});next=now+Math.max(110,300-p*190)}
   if(now>=bolt){drops.push({x:cx,y:76,v:520+p*180,b:1});bolt=now+rnd(2600,4200);sfx.thunder()}}
  for(let i=drops.length-1;i>=0;i--){const o=drops[i];o.y+=o.v*dt;if(over)continue;
   if(o.y>=hy-30&&o.y<=hy+12&&Math.abs(o.x-hill)<58){drops.splice(i,1);blocked+=o.b?3:1;spl.push({x:o.x,y:hy-30,t:now});if(o.b){sfx.good();burstAt(o.x,hy-30+F.offsetTop,10,['#fff','#ffe066'])}continue}
   if(o.y>=vy-24){drops.splice(i,1);hp-=o.b?12:4;hearts();sfx.bad();buzz(o.b?140:40);flash(o.b?'#ffffff':'#4d8dff');if(o.b)shakeEl(F);
    if(hp<=0)fin(0,t('flood',{d:day}))}}
  x.clearRect(0,0,W,H);
  spr(x,'cloud',84,cx,42);
  x.strokeStyle='rgba(160,210,255,.85)';x.lineWidth=2.5;x.lineCap='round';x.beginPath();
  for(const o of drops)if(!o.b){x.moveTo(o.x,o.y-12);x.lineTo(o.x,o.y)}x.stroke();
  for(const o of drops)if(o.b)spr(x,'bolt',42,o.x,o.y);
  for(let i=spl.length-1;i>=0;i--){const s=spl[i],k=(now-s.t)/300;if(k>=1){spl.splice(i,1);continue}x.strokeStyle=`rgba(200,230,255,${(1-k).toFixed(2)})`;x.lineWidth=2;x.beginPath();x.arc(s.x,s.y,6+k*16,Math.PI,0);x.stroke()}
  const n=Math.max(4,Math.round(W/70));for(let i=0;i<n;i++)spr(x,i%2?'cow':'house',34,W*(i+.5)/n,vy);
  x.strokeStyle='#ffd8a8';x.lineWidth=3;x.beginPath();x.moveTo(hill,hy+40);x.lineTo(hill,hy+52);x.stroke();
  spr(x,'child',38,hill,hy+70);spr(x,'hill',116,hill,hy)});
};

/* 3 · SWIPE: true / false wisdom cards */
E.swipe=(st,c,done)=>{
 const R=field(st,'sw'),cards=shuffle(c.cards),n=cards.length;
 R.innerHTML=`<div class="deck"></div><div class="swb"><button class="no" aria-label="${t('F')}">${ic('close')}</button><button class="yes" aria-label="${t('T')}">${ic('check')}</button></div><div class="why">${t('swH')}</div>`;
 const deck=$('.deck',R),why=$('.why',R);let i=0,ok=0,busy=true,top=null;
 HUD.time(null);const sc=()=>HUD.score(`${ic('check')}${ok}/${n}`);sc();
 const make=k=>h('div','sc',`<span class="lbl t">${t('T')}</span><span class="lbl f">${t('F')}</span><div class="se">${ic(cards[k][0])}</div><div class="sq">${cards[k][1]}</div><div class="sn">${k+1} / ${n}</div>`);
 function deal(){deck.innerHTML='';if(i+1<n){const b=make(i+1);b.classList.add('back');deck.appendChild(b)}top=make(i);deck.appendChild(top);drag(top);busy=false}
 function drag(el){let sx=0,dx=0,on=false;const lt=$('.t',el),lf=$('.f',el);
  el.addEventListener('pointerdown',e=>{if(busy)return;on=true;sx=e.clientX;dx=0;el.style.transition='none';try{el.setPointerCapture(e.pointerId)}catch(_){}});
  el.addEventListener('pointermove',e=>{if(!on)return;dx=e.clientX-sx;el.style.transform=`translateX(${dx}px) rotate(${dx/16}deg)`;lt.style.opacity=clamp(dx/90,0,1);lf.style.opacity=clamp(-dx/90,0,1)});
  const up=()=>{if(!on)return;on=false;if(Math.abs(dx)>90)decide(dx>0);else{el.style.transition='transform .25s';el.style.transform='';lt.style.opacity=lf.style.opacity=0}};
  el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)}
 function decide(yes){if(busy||G.paused)return;busy=true;const cd=cards[i],right=yes===!!cd[2],el=top;
  $(yes?'.t':'.f',el).style.opacity=1;el.style.transition='transform .35s ease-in,opacity .35s';
  el.style.transform=`translateX(${(yes?1:-1)*(R.clientWidth+160)}px) rotate(${yes?28:-28}deg)`;el.style.opacity=0;
  if(right){ok++;sfx.good();buzz(12)}else{sfx.bad();buzz(70)}
  why.className='why '+(right?'good':'bad');why.innerHTML=`${ic(right?'check':'close')} <b>${t(right?'right':'wrong')}</b> ${cd[3]}`;if(!right)shakeEl(why);
  sc();i++;
  if(i<n)G.later(deal,380);else G.later(()=>done({stars:ok>=n?3:ok>=n-2?2:ok>=Math.ceil(n*.6)?1:0,line:t('judged',{o:ok,n})}),1600)}
 $('.yes',R).onclick=()=>decide(true);$('.no',R).onclick=()=>decide(false);
 keys(e=>{if(e.key==='ArrowRight')decide(true);if(e.key==='ArrowLeft')decide(false)});
 deal();
};

/* 4 · RHYTHM: play the dhak, light 14 lamps */
E.rhythm=(st,c,done)=>{
 const R=field(st,'rh');
 R.innerHTML=`<div class="l14">${ic('diya').repeat(14)}</div><div class="rw"><div class="rtg">${ic('drum')}</div></div><div class="rj"></div><div class="rsub">${t('rhS')}</div>`;
 const rw=$('.rw',R),tg=$('.rtg',R),rj=$('.rj',R),lamps=$$('.l14 .i',R),beat=600,A=1150,s0=G.now(),notes=[];
 let tt=s0+1500,hits=0,slips=0,perf=0,combo=0,over=false;
 [1,1,1,.5,.5,1,1,1,1,.5,.5,1,.5,.5,1,1,.5,.5].forEach(d=>{notes.push({t:tt,j:0,el:null});tt+=d*beat});
 const endT=tt+300,lit=()=>clamp(hits-slips,0,14);
 const paint=()=>{const n=lit();lamps.forEach((s,k)=>s.classList.toggle('on',k<n));HUD.score(`${ic('diya')}${n}/14`)};
 const say=(txt,col)=>{rj.textContent=txt;rj.style.color=col;rj.classList.remove('hit');void rj.offsetWidth;rj.classList.add('hit')};
 function tap(){if(over||G.paused)return;const now=G.now();let b=null,bd=1e9;
  for(const n of notes)if(!n.j){const d=Math.abs(now-n.t);if(d<bd){bd=d;b=n}}
  tg.classList.remove('hit');void tg.offsetWidth;tg.classList.add('hit');sfx.drum();buzz(15);
  if(b&&bd<=150){b.j=1;if(b.el){b.el.remove();b.el=null}hits++;combo++;
   if(bd<=65){perf++;say(combo>=4?`${t('perfect')} ×${combo}`:t('perfect'),'#ffe066')}else say(t('good'),'#7dffb8');
   const [px,py]=rel(tg);burstAt(px,py,10,['#ff3b3b','#ffd166','#fff'])}
  else{slips++;combo=0;say(t('offb'),'#ff8a9b');shakeEl(rw)}
  paint()}
 R.addEventListener('pointerdown',tap);
 keys(e=>{if(e.code==='Space'){e.preventDefault();tap()}});
 paint();
 G.loop(now=>{if(over)return;HUD.time(1-clamp((now-s0)/(endT-s0),0,1));
  for(const n of notes){if(n.j)continue;const d=n.t-now;if(d>A)break;
   if(!n.k&&d<=0){n.k=1;sfx.tick()}
   if(!n.el){n.el=h('div','ring');rw.appendChild(n.el)}
   if(d<-150){n.j=2;n.el.remove();n.el=null;combo=0;say(t('miss'),'#ff5d7a');continue}
   const s=d>=0?1+d/A*1.7:1+d/A*.8,o=d>=0?.15+.85*(1-d/A):clamp(1+d/150,0,1);
   n.el.style.transform=`scale(${s.toFixed(3)})`;n.el.style.opacity=o.toFixed(2)}
  if(now>=endT){over=true;const L=lit();G.later(()=>done({stars:L>=14?3:L>=10?2:L>=7?1:0,line:t('rhEnd',{l:L,p:perf})}),500)}});
};

/* 5 · SLASH: cut Narakasura’s shadows, spare the diyas */
E.slash=(st,c,done)=>{
 const F=field(st),K=makeCanvas(F),x=K.ctx,T=c.time*1000,t0=G.now(),g=900;
 let objs=[],trail=[],lives=3,cut=0,over=false,next=t0+500,last=t0,down=false,px=0,py=0;
 HUD.lives(3);const sc=()=>HUD.score(`${ic('demon')}${Math.min(cut,c.goal)}/${c.goal}`);sc();
 const end=win=>{if(over)return;over=true;G.later(()=>done({stars:win?lives:0,line:win?t('slashW',{c:cut,l:lives}):lives<=0?t('slashD'):t('slashL',{c:cut,g:c.goal})}),700)};
 function wave(){const W=K.W,H=K.H,n=Math.random()<.35?ri(2,3):1;
  for(let k=0;k<n;k++){const sx=rnd(W*.15,W*.85),pk=rnd(H*.12,H*.42),vy=-Math.sqrt(2*g*(H+40-pk)),ft=-2*vy/g;
   objs.push({x:sx,y:H+40,vx:(rnd(W*.25,W*.75)-sx)/ft,vy,r:rnd(-3,3),a:0,d:Math.random()<.22,cut:0})}}
 const pos=e=>{const r=K.c.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
 K.c.addEventListener('pointerdown',e=>{down=true;[px,py]=pos(e);trail=[{x:px,y:py,t:G.now()}];try{K.c.setPointerCapture(e.pointerId)}catch(_){}});
 K.c.addEventListener('pointermove',e=>{if(!down||over||G.paused)return;const[nx,ny]=pos(e);if(Math.hypot(nx-px,ny-py)<4)return;
  const now=G.now();trail.push({x:nx,y:ny,t:now});let sl=0;
  for(const o of objs){if(o.cut||segDist(o.x,o.y,px,py,nx,ny)>34)continue;o.cut=1;o.ct=now;const gy=o.y+F.offsetTop;
   if(o.d){lives--;HUD.lives(lives);sfx.bad();buzz(130);flash('#ffb52e');shakeEl(F);pop(t('notDiya'),o.x,gy,'bad');if(lives<=0)end(false)}
   else{cut++;sl++;sfx.whoosh();buzz(14);burstAt(o.x,gy,14,['#b197fc','#ff5d7a','#ffd166']);sc();if(cut>=c.goal)end(true)}}
  if(sl>1){pop(t('combo',{n:sl}),nx,ny+F.offsetTop-30,'good big');sfx.good()}
  px=nx;py=ny});
 const up=()=>{down=false};K.c.addEventListener('pointerup',up);K.c.addEventListener('pointercancel',up);
 G.loop(now=>{const dt=Math.min(.05,(now-last)/1000);last=now;const W=K.W,H=K.H;
  if(!over){const el=now-t0;HUD.time(1-el/T);if(el>=T)end(false);else if(now>=next){wave();next=now+Math.max(520,1050-el/T*500)}}
  for(const o of objs){o.vy+=g*dt;o.x+=o.vx*dt;o.y+=o.vy*dt;o.a+=o.r*dt}
  objs=objs.filter(o=>o.y<H+90&&!(o.cut&&now-o.ct>350));
  x.clearRect(0,0,W,H);
  for(const o of objs){if(o.cut){spr(x,o.d?'boom':'puff',54,o.x,o.y,0,1-(now-o.ct)/350);continue}
   if(o.d){x.fillStyle='rgba(255,190,60,.22)';x.beginPath();x.arc(o.x,o.y,34,0,6.283);x.fill()}
   spr(x,o.d?'diya':'demon',o.d?48:56,o.x,o.y,o.d?0:o.a)}
  trail=trail.filter(p=>now-p.t<150);
  if(trail.length>1){x.lineCap=x.lineJoin='round';x.strokeStyle='rgba(255,236,170,.95)';x.shadowColor='#ffb52e';x.shadowBlur=14;x.lineWidth=6;x.beginPath();trail.forEach((p,k)=>k?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.stroke();x.shadowBlur=0}});
};

/* 6 · RANGOLI: mirror the pattern */
E.rangoli=(st,c,done)=>{
 const R=field(st,'rg'),T=120000,t0=G.now(),RS=[{n:6,p:['#ff8a1f','#e8355a']},{n:8,p:['#ffcf3a','#e8355a','#22b8a0']}];
 let r=0,tg=[],cells=[],lock=false,over=false;
 const sc=()=>HUD.score(`${ic('palette')}${r+1}/2`);sc();
 function gen(n,k){const q=n/2,v=Array.from({length:n},()=>Array(n).fill(0));
  for(let a=0;a<q;a++)for(let b=a;b<q;b++)v[a][b]=v[b][a]=Math.random()<.7?ri(1,k):0;
  if(!v[q-1][q-1])v[q-1][q-1]=1;
  for(let a=0;a<q;a++)for(let b=0;b<q;b++)v[a][n-1-b]=v[n-1-a][b]=v[n-1-a][n-1-b]=v[a][b];
  return v}
 const paintC=(e,p)=>{e.style.background=e._v?p[e._v-1]:'';e.style.boxShadow=e._v?`0 0 10px ${p[e._v-1]}88`:''};
 function build(){const {n,p}=RS[r];tg=gen(n,p.length);lock=false;
  R.innerHTML=`<div class="rgt">${t('rgT',{r:r+1})}</div><div class="rgrid" style="grid-template-columns:repeat(${n},1fr)"></div><div class="rhint"></div><div class="rpal">${t('rgP')} <i></i>${p.map(cl=>`→<i style="background:${cl}"></i>`).join('')}→<i></i></div>`;
  const gr=$('.rgrid',R);cells=[];
  for(let a=0;a<n;a++)for(let b=0;b<n;b++){const e=h('button','rc'+(b<n/2?' lh':''));e._a=a;e._b=b;e._v=b<n/2?tg[a][b]:0;paintC(e,p);gr.appendChild(e);cells.push(e)}
  gr.addEventListener('pointerdown',ev=>{const e=ev.target.closest('.rc');if(!e||e._b<n/2||lock||over||G.paused)return;
   e._v=(e._v+1)%(p.length+1);paintC(e,p);sfx.bell(e._v);buzz(8);check()});
  check(true)}
 function check(init){const {n}=RS[r];let left=0;for(const e of cells)if(e._b>=n/2&&e._v!==tg[e._a][e._b])left++;
  $('.rhint',R).innerHTML=left?t('rgL',{n:left}):ic('sparkle')+' '+t('rgOk');
  if(left||init)return;
  lock=true;const gr=$('.rgrid',R);gr.classList.add('win');sfx.win();const [gx,gy]=rel(gr);burstAt(gx,gy,30,['#ffcf3a','#e8355a','#22b8a0','#ff8a1f']);
  r++;if(r<RS.length){sc();G.later(build,1200)}
  else{over=true;const used=G.now()-t0,f=1-used/T;G.later(()=>done({stars:f>=.5?3:f>=.25?2:1,line:t('rgW',{s:Math.round(used/1000)})}),1200)}}
 G.loop(now=>{if(over)return;const f=1-(now-t0)/T;HUD.time(f);if(f<=0){over=true;done({stars:0,line:t('rgF',{r})})}});
 build();
};

/* 7 · QUIZ: Tihar days / lightning finale. items: [question, [4 answers, correct first], explanation] */
E.quiz=(st,c,done)=>{
 const R=field(st,'qz'),P=c.per*1000;let items=c.order?c.items.slice():shuffle(c.items);if(c.pick)items=items.slice(0,c.pick);
 const n=items.length;let q=-1,ok=0,pts=0,qs=0,ans=true,over=false;
 R.innerHTML=`<div class="ql">${ic('diya').repeat(n)}</div><div class="qn"></div><div class="qq"></div><div class="qopts"></div><div class="qw" aria-live="polite"></div>`;
 const L=$$('.ql .i',R),qn=$('.qn',R),qq=$('.qq',R),qo=$('.qopts',R),qw=$('.qw',R);
 HUD.score(`${ic('bolt')}0`);
 function next(){if(++q>=n){over=true;const f=ok/n;return done({stars:f>=.85?3:f>=.6?2:f>=.5?1:0,line:t('qEnd',{o:ok,n,p:pts})})}
  const it=items[q];ans=false;qs=G.now();qn.textContent=t('qN',{q:q+1,n});
  qq.textContent=it[0];qq.style.animation='none';void qq.offsetWidth;qq.style.animation='';qw.textContent='';
  qo.innerHTML=shuffle(it[1].map((o,k)=>({o,k}))).map(({o,k})=>`<button class="qo" data-k="${k}">${o}</button>`).join('')}
 function pick(k,btn){if(ans||over)return;ans=true;const it=items[q],right=k===0;
  if(right){const gain=100+Math.round(clamp(1-(G.now()-qs)/P,0,1)*100);ok++;pts+=gain;sfx.good();buzz(12);L[q].classList.add('y');const [bx,by]=rel(btn);pop(`+${gain}`,bx,by);burstAt(bx,by,10)}
  else{sfx.bad();buzz(70);L[q].classList.add('n');if(btn)shakeEl(btn)}
  $$('.qo',qo).forEach(b=>{if(b.dataset.k==='0')b.classList.add('ok');else if(b===btn)b.classList.add('no')});
  qw.innerHTML=`${right?ic('check'):btn?ic('close'):ic('clock')+' '+t('tUp')} ${it[2]}`;HUD.score(`${ic('bolt')}${pts}`);
  G.later(next,right?1300:2200)}
 qo.addEventListener('pointerdown',e=>{const b=e.target.closest('.qo');if(b&&!G.paused)pick(+b.dataset.k,b)});
 qo.addEventListener('keydown',e=>{const b=e.target.closest('.qo');if(b&&(e.key==='Enter'||e.key===' ')){e.preventDefault();pick(+b.dataset.k,b)}});
 G.loop(now=>{if(over||ans)return;const f=1-(now-qs)/P;HUD.time(f);if(f<=0)pick(-1,null)});
 next();
};

/* 8 · RUNNER: sail the kala pani */
E.runner=(st,c,done)=>{
 const F=field(st),K=makeCanvas(F),x=K.ctx,T=c.time*1000,t0=G.now(),objs=[],TH=[.3,.6,.9],MS=['rn1','rn2','rn3'];
 let lane=1,lives=3,inv=0,lamps=0,next=t0+700,last=t0,over=false,won=0,ms=0,dist=0,gx=0,moved=false;
 HUD.lives(3);const sc=()=>HUD.score(`${ic('diya')}${lamps}`);sc();
 const LX=k=>K.W*(.2+.3*k);let sx=LX(1);
 const move=d=>{if(over||G.paused)return;const nl=clamp(lane+d,0,2);if(nl!==lane){lane=nl;sfx.whoosh();buzz(8)}};
 K.c.addEventListener('pointerdown',e=>{gx=e.clientX;moved=false;try{K.c.setPointerCapture(e.pointerId)}catch(_){}});
 K.c.addEventListener('pointermove',e=>{if(!e.buttons&&e.pointerType==='mouse')return;const d=e.clientX-gx;if(Math.abs(d)>30){move(Math.sign(d));gx=e.clientX;moved=true}});
 K.c.addEventListener('pointerup',e=>{if(moved)return;const r=K.c.getBoundingClientRect();move(e.clientX-r.left<r.width/2?-1:1)});
 keys(e=>{if(e.key==='ArrowLeft')move(-1);if(e.key==='ArrowRight')move(1)});
 function row(){const obs=[ri(0,2)];if(Math.random()<.3)obs.push((obs[0]+ri(1,2))%3);
  obs.forEach(l=>objs.push({l,y:-40,t:Math.random()<.5?'storm':'whirl',o:1}));
  const free=[0,1,2].filter(l=>!obs.includes(l));if(Math.random()<.65)objs.push({l:any(free),y:-40,t:'diya',o:0})}
 G.loop(now=>{const dt=Math.min(.05,(now-last)/1000);last=now;const W=K.W,H=K.H,el=now-t0,p=clamp(el/T,0,1),sp=260+p*220,sy=H-110;
  dist+=sp*dt;
  if(!over){HUD.time(1-p);
   if(ms<3&&p>=TH[ms]){pop(t(MS[ms]),W/2,F.offsetTop+H*.32,'good big');ms++}
   if(el>=T){over=true;won=now;sfx.win();G.later(()=>done({stars:lives,line:t('rnW',{l:lamps})}),1400)}
   else if(now>=next){row();next=now+Math.max(430,820-p*390)}}
  sx+=(LX(lane)-sx)*Math.min(1,dt*14);
  for(const o of objs){o.y+=sp*dt;
   if(over||o.hit||o.l!==lane||Math.abs(o.y-sy)>38)continue;
   if(!o.o){o.hit=1;lamps++;sc();sfx.good();buzz(10);burstAt(LX(o.l),o.y+F.offsetTop,10);continue}
   if(now<inv)continue;
   o.hit=1;lives--;inv=now+1200;HUD.lives(lives);sfx.bad();buzz(150);flash('#3aa0ff');shakeEl(F);
   if(lives<=0){over=true;G.later(()=>done({stars:0,line:t('rnL')}),800)}}
  for(let i=objs.length-1;i>=0;i--){const o=objs[i];if(o.y>H+60||(o.hit&&!o.o))objs.splice(i,1)}
  x.clearRect(0,0,W,H);
  x.strokeStyle='rgba(180,230,255,.16)';x.lineWidth=2;
  for(let i=0;i<9;i++){const y=(dist*.6+i*H/9)%H;x.beginPath();for(let xx=0;xx<=W;xx+=24)x.lineTo(xx,y+Math.sin(xx/38+i*1.7)*5);x.stroke()}
  x.setLineDash([14,22]);x.lineDashOffset=-dist;x.strokeStyle='rgba(255,255,255,.12)';x.beginPath();x.moveTo(W*.35,0);x.lineTo(W*.35,H);x.moveTo(W*.65,0);x.lineTo(W*.65,H);x.stroke();x.setLineDash([]);
  if(won)spr(x,'island',110,W/2,Math.min(H*.3,-60+(now-won)*.4));
  for(const o of objs){const X=LX(o.l);
   if(o.o)spr(x,o.t,o.t==='whirl'?52:58,X,o.y,o.t==='whirl'?now/250:0,o.hit?.45:1);
   else{x.fillStyle='rgba(255,190,60,.22)';x.beginPath();x.arc(X,o.y,26,0,6.283);x.fill();spr(x,'diya',36,X,o.y)}}
  spr(x,'ship',66,sx,sy,0,now<inv&&Math.floor(now/100)%2?.3:1)});
};

/* 9 · SIMON: bamboo deya patterns */
E.simon=(st,c,done)=>{
 const R=field(st,'sm'),P=['#ffd166','#ff6b6b','#4dabf7','#69db7c','#da77f2','#ffa94d'];
 R.innerHTML=`<div class="si" aria-live="polite">${t('smW')}</div><div class="arch">${P.map((cl,i)=>`<button class="pad" data-i="${i}" style="--pc:${cl}" aria-label="${i+1}">${ic('diya')}</button>`).join('')}</div><div class="ss"></div>`;
 const pads=$$('.pad',R),si=$('.si',R),ss=$('.ss',R),seq=[];let pos=0,inp=false,lives=3,round=0,over=false;
 HUD.time(null);HUD.lives(3);HUD.score(`${ic('bamboo')}0/${c.goal}`);
 const glow=(i,ms)=>{pads[i].classList.add('on');sfx.bell(i);G.later(()=>pads[i].classList.remove('on'),ms)};
 function play(){inp=false;pos=0;si.textContent=t('smW');const on=Math.max(300,540-round*35),gap=Math.max(110,200-round*14);
  seq.forEach((v,k)=>G.later(()=>glow(v,on),600+k*(on+gap)));
  G.later(()=>{inp=true;si.textContent=t('smY')},600+seq.length*(on+gap))}
 function nextRound(){round++;while(seq.length<round+2)seq.push(ri(0,5));ss.textContent=t('smP',{r:round,g:c.goal,n:seq.length});play()}
 function press(i,b){if(!inp||over||G.paused)return;glow(i,220);buzz(10);
  if(i===seq[pos]){if(++pos<seq.length)return;inp=false;si.textContent=t('smG');sfx.good();const [bx,by]=rel(b);burstAt(bx,by,14);HUD.score(`${ic('bamboo')}${round}/${c.goal}`);
   if(round>=c.goal){over=true;G.later(()=>done({stars:lives,line:t('smE',{g:c.goal})}),900)}else G.later(nextRound,900);return}
  inp=false;lives--;HUD.lives(lives);sfx.bad();buzz(120);flash();shakeEl($('.arch',R));
  if(lives<=0){over=true;si.textContent=t('smD');G.later(()=>done({stars:0,line:t('smL',{r:round,g:c.goal})}),1000)}
  else{si.textContent=t('smO');G.later(play,1100)}}
 R.addEventListener('pointerdown',e=>{const b=e.target.closest('.pad');if(b)press(+b.dataset.i,b)});
 keys(e=>{const k=+e.key;if(k>=1&&k<=6)press(k-1,pads[k-1])});
 nextRound();
};

/* 10 · MEMORY: open-house word match. pairs: [word, meaning] */
E.memory=(st,c,done)=>{
 const R=field(st,'mm'),T=75000,t0=G.now(),np=c.pairs.length,deck=[];
 c.pairs.forEach((p,k)=>deck.push({k,f:`<b>${p[0]}</b>`},{k,f:`${ic('chat')}<span>${p[1]}</span>`}));
 const D=shuffle(deck);
 R.innerHTML=`<div class="mgr">${D.map((d,i)=>`<button class="mcd f" data-i="${i}"><div class="in"><div class="ba">${ic('diya')}</div><div class="fa">${d.f}</div></div></button>`).join('')}</div><div class="why" aria-live="polite">${t('mmM')}</div>`;
 const why=$('.why',R);let open=[],got=0,moves=0,lock=true,over=false;
 const sc=()=>HUD.score(`${ic('house')}${got}/${np}`);sc();
 G.later(()=>{$$('.mcd',R).forEach(e=>e.classList.remove('f'));lock=false;why.textContent=t('mmH')},2000);
 R.addEventListener('pointerdown',e=>{const b=e.target.closest('.mcd');if(!b||lock||over||G.paused||b.classList.contains('f'))return;
  b.classList.add('f');sfx.tap();open.push(b);if(open.length<2)return;
  moves++;const [a,z]=open,ka=D[+a.dataset.i].k,kz=D[+z.dataset.i].k;open=[];
  if(ka===kz){got++;a.classList.add('m');z.classList.add('m');sfx.good();buzz(15);const p=c.pairs[ka];why.className='why good';why.innerHTML=`${ic('check')} <b>${p[0]}</b> = ${p[1]}`;sc();const [bx,by]=rel(z);burstAt(bx,by,10);
   if(got===np){over=true;sfx.win();G.later(()=>done({stars:moves<=10?3:moves<=15?2:1,line:t('mmE',{n:np,m:moves})}),900)}}
  else{lock=true;sfx.tick();buzz(30);G.later(()=>{a.classList.remove('f');z.classList.remove('f');lock=false},750)}});
 G.loop(now=>{if(over)return;const f=1-(now-t0)/T;HUD.time(f);if(f<=0){over=true;done({stars:0,line:t('mmL',{g:got,n:np})})}});
};

/* 11 · LIGHTS: Golden Mile switch-on puzzle */
E.lights=(st,c,done)=>{
 const R=field(st,'lo');let g=[],need=new Set(),init=null,moves=0,hints=0,over=false;
 R.innerHTML=`<div class="si">${t('lT')}</div><div class="lg">${`<button class="lc">${ic('bulb')}</button>`.repeat(16)}</div><div class="lrow"><button class="btn" data-a="h">${ic('bulb')}${t('hint')}</button><button class="btn" data-a="r">${ic('restart')}${t('restart')}</button></div><div class="ss">${t('lS')}</div>`;
 const cs=$$('.lc',R),si=$('.si',R);HUD.time(null);
 const press=i=>{const r=i>>2,k=i&3;[[0,0],[1,0],[-1,0],[0,1],[0,-1]].forEach(([a,b])=>{const y=r+a,z=k+b;if(y>=0&&y<4&&z>=0&&z<4)g[y*4+z]^=1});need.has(i)?need.delete(i):need.add(i)};
 const paint=hi=>{cs.forEach((e,i)=>{e.classList.toggle('on',!!g[i]);e.classList.toggle('hint',i===hi)});HUD.score(`${ic('bulb')}${g.filter(v=>v).length}/16`);si.textContent=moves?t('lM',{m:moves})+(hints?' · '+t('lHn',{h:hints}):''):t('lT')};
 do{g=Array(16).fill(1);need=new Set();for(let k=0;k<6;k++)press(ri(0,15))}while(need.size<3||g.every(v=>v));
 init={g:g.slice(),n:[...need]};paint(-1);
 R.addEventListener('pointerdown',e=>{if(over||G.paused)return;const b=e.target.closest('.lc,[data-a]');if(!b)return;
  if(b.dataset.a==='h'){hints++;sfx.tick();paint([...need][0]);return}
  if(b.dataset.a==='r'){g=init.g.slice();need=new Set(init.n);moves=0;sfx.whoosh();paint(-1);return}
  const i=cs.indexOf(b);press(i);moves++;sfx.bell(i%6);buzz(8);paint(-1);
  if(g.every(v=>v)){over=true;sfx.win();const [lx,ly]=rel($('.lg',R));burstAt(lx,ly,36,['#ffe7a0','#ff9f1c','#fff']);
   const opt=init.n.length,s=Math.max(1,(moves<=opt+2?3:moves<=opt+8?2:1)-hints);
   G.later(()=>done({stars:s,line:t('lE',{m:moves})+(hints?' · '+t('lHn',{h:hints}):'')}),1000)}});
};
