// Split from the original single-file build. Logic unchanged; see openspec/changes/migrate-to-solidjs.
// Screens not yet migrated to Solid components. Shrinks one screen at a time (tasks.md group 5).
import {$,$$,h,app,RM,gst} from '../core/util.js';
import {ic,stars} from '../core/icons.js';
import {save,persist} from '../core/save.js';
import {LN,U,t,getTL,setTL,X,nameOf,langsOf,lgOf,gcfg,SL} from '../core/i18n.js';
import {actx,sfx,buzz,suspendAudio} from '../core/audio.js';
import {fxSize,confetti} from '../core/fx.js';
import {G,HUD} from '../core/clock.js';
import {PRO,LV} from '../data/levels.js';
import {E} from '../game/engines.js';
export function setUI(){setTL(save.lang);document.documentElement.lang=save.lang;document.documentElement.classList.toggle('big',!!save.big);$('#g-pause').innerHTML=ic('pause');$('#g-pause').setAttribute('aria-label',t('paused'))}
/* ===================== SCREENS ===================== */
export let screen='',cur={L:null,i:0,p:0,lg:'en'},justUnlocked=-1,mapW=0,albumBack='map',escFn=null,storyGo=()=>{};
export const unlocked=i=>i===0||(save.stars[LV[i-1].id]||0)>0;
export const totalStars=()=>LV.reduce((a,l)=>a+(save.stars[l.id]||0),0);
export function show(id){$$('.scr').forEach(s=>s.classList.toggle('on',s.id===id));screen=id}
export function modal(x,esc){const m=$('#modal');m.innerHTML=x;m.lang=getTL();m.classList.add('on');escFn=esc||null;const b=$('.btn',m);if(b)try{b.focus({preventScroll:true})}catch(e){}return m}
export function closeModal(){const m=$('#modal');m.classList.remove('on');m.innerHTML='';escFn=null}
export function toast(t){const e=h('div','toast',t);e.setAttribute('role','status');app.appendChild(e);setTimeout(()=>e.remove(),2300)}
export const onOff=(k,v)=>`${t(k)}: <b>${t(v?'on':'off')}</b>`;

export function goTitle(){G.reset();closeModal();setTL(save.lang);show('s-title');const started=Object.keys(save.stars).length>0;
 $('#s-title').innerHTML=`<div class="sky"></div><div class="tc"><div class="hero">${ic('diya')}</div><h1 class="logo">Deepa Quest</h1><p class="tag">${t('tag')}</p>
 <div class="stack"><button class="btn pri" id="tp">${ic('play')}${t(started?'cont':'begin')}</button><button class="btn" id="ta">${ic('book')}${t('album')}</button>
 <button class="btn" id="tl">${ic('globeL')}<span>${t('lang')}: <b lang="${save.lang}">${LN[save.lang]}</b></span></button>
 <div class="row"><button class="btn" id="ts" aria-pressed="${save.snd}">${ic(save.snd?'sndOn':'sndOff')}${t('sound')}</button><button class="btn" id="th" aria-pressed="${save.hap}">${ic(save.hap?'vib':'vibOff')}${t('vib')}</button></div></div>
 <p class="foot">${t('foot')}</p></div>`;
 $('#tp').onclick=()=>{actx();sfx.good();if(!save.seen){save.seen=true;persist();openStory(PRO,-1)}else goMap()};
 $('#ta').onclick=()=>goAlbum('title');
 $('#tl').onclick=()=>{sfx.tap();pickLang(goTitle)};
 $('#ts').onclick=()=>{save.snd=!save.snd;persist();goTitle();sfx.tap()};
 $('#th').onclick=()=>{save.hap=!save.hap;persist();buzz(30);goTitle()};
}
export function pickLang(back){const ks=Object.keys(LN);
 modal(`<div class="mcard"><div class="rt">${t('langT')}</div><div class="stack" id="lgs" style="margin-top:16px">${ks.map(l=>`<button class="btn${l===save.lang?' sel':''}" data-l="${l}" lang="${l}">${LN[l]}${l===save.lang?ic('check'):''}</button>`).join('')}<button class="btn ghost" id="lc">${t('close')}</button></div></div>`,closeModal);
 $('#lgs').onclick=e=>{const b=e.target.closest('[data-l]');if(b){save.lang=b.dataset.l;persist();setUI();sfx.tap();closeModal();back()}else if(e.target.closest('#lc'))closeModal()}}

export function goMap(){G.reset();closeModal();setTL(save.lang);show('s-map');renderMap()}
export function renderMap(){
 const S=$('#s-map');setTL(save.lang);
 S.innerHTML=`<div class="mhead"><button class="ib" id="mh" aria-label="${t('home')}">${ic('home')}</button><span class="mlogo">${ic('diya')} Deepa Quest</span><span class="chip">${ic('star')}${totalStars()}/${LV.length*3}</span><button class="ib" id="ma" aria-label="${t('album')}">${ic('book')}</button><button class="ib" id="ms" aria-label="${t('settings')}">${ic('sliders')}</button></div><div class="mscroll"><div class="mapw"></div></div>`;
 const sc=$('.mscroll',S),wrap=$('.mapw',S),W=sc.clientWidth||360;mapW=app.clientWidth;
 const xs=[.5,.76,.5,.24],pts=[];let y=70,html='';
 LV.forEach((l,i)=>{if(l.chap){y+=i?40:0;html+=`<div class="chap" style="top:${y}px">${t(l.chap)}</div>`;y+=92}
  const xf=xs[i%4];pts.push({x:Math.round(W*xf),y});
  const dx=xf>.5?.15:xf<.5?.85:(i%8<4?.15:.85);html+=`<span class="deco" style="left:${Math.round(W*dx)}px;top:${y+10}px">${ic(l.deco)}</span>`;
  y+=132});
 const H=y+20,c=LV.findIndex((l,i)=>unlocked(i)&&!(save.stars[l.id]>0)),reach=c<0?LV.length-1:c;
 const path=n=>pts.slice(0,n+1).map((p,i,a)=>{if(!i)return`M${p.x} ${p.y}`;const q=a[i-1],m=(q.y+p.y)/2;return`C${q.x} ${m} ${p.x} ${m} ${p.x} ${p.y}`}).join(' ');
 html=`<svg class="pth" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><path class="pb" d="${path(LV.length-1)}"/><path class="pl" d="${path(reach)}"/></svg>`+html;
 LV.forEach((l,i)=>{const p=pts[i],s=save.stars[l.id]||0,lk=!unlocked(i),cls=lk?'lock':s?'done':'cur',nm=nameOf(l),ln=l.ll&&l.ll[0],sub=ln&&l.tr[ln].n!==nm?l.tr[ln].n:'';
  html+=`<button class="node ${cls}${i===justUnlocked?' new':''}" style="left:${p.x}px;top:${p.y}px;--c:${l.color}" data-i="${i}" aria-label="${nm}${lk?' · '+t('locked'):''}">${i===c?`<span class="now">${t('playB')}</span>`:''}<span class="orb">${ic(l.icon)}${lk?`<span class="lk">${ic('lock')}</span>`:''}</span><span class="nm">${nm}${sub?`<small lang="${ln}">${sub}</small>`:''}</span><span class="st">${lk?'':stars(s)}</span></button>`});
 wrap.style.height=H+'px';wrap.innerHTML=html;
 wrap.onclick=e=>{const b=e.target.closest('.node');if(!b)return;const i=+b.dataset.i;
  if(!unlocked(i)){sfx.bad();buzz(60);toast(ic('lock')+t('locked'));return}
  sfx.tap();openStory(LV[i],i)};
 $('#mh').onclick=goTitle;$('#ma').onclick=()=>goAlbum('map');$('#ms').onclick=settings;
 const f=pts[justUnlocked>=0?justUnlocked:reach];sc.scrollTop=Math.max(0,f.y-sc.clientHeight*.5);justUnlocked=-1;
}

export function openStory(L,i){G.reset();closeModal();cur={L,i,p:0,lg:lgOf(L)};show('s-story');renderStory()}
export const artSize=n=>`min(${Math.min(34,74/n).toFixed(1)}vw,${Math.round(Math.min(150,300/n))}px)`;
export function renderStory(){
 const {L,i,p,lg}=cur,S=$('#s-story'),P=L.story,mis=p>=P.length,x=X(L,lg),ops=langsOf(L);setTL(lg);S.lang=lg;
 S.style.setProperty('--sbg',L.sbg);
 const nx=ops[(ops.indexOf(lg)+1)%ops.length];
 const bars=P.map((_,k)=>`<i class="${k<=p?'f':''}"></i>`).join('')+(L.pro?'':`<i class="${mis?'f':''}"></i>`);
 const top=`<div class="stop"><span class="place">${ic('pin')}<span>${x.w}</span></span>${ops.length>1?`<button class="pill" id="sl" aria-label="${t('storyIn')}: ${LN[nx]}">${ic('globeL')}<span lang="${nx}">${LN[nx]}</span></button>`:''}${!mis&&!L.pro?`<button class="ib" id="sk" aria-label="${t('skip')}" title="${t('skip')}">${ic('skip')}</button>`:''}<button class="ib" id="sx" aria-label="${t('close')}">${ic('close')}</button></div>`;
 const body=!mis?`<div class="sart"><span class="art" style="--s:${artSize(P[p][0].length)}">${P[p][0].map(n=>ic(n)).join('')}</span></div><div class="stext"><b class="who">${L.pro?t('jyoti'):x.n}</b><p aria-live="polite">${x.s[p]}</p><div class="snav"><button class="sbtn" id="sb"${p?'':' disabled'}>${ic('bwd')}${t('prev')}</button><button class="sbtn go" id="sn">${t(L.pro&&p===P.length-1?'begin2':'next')}${ic('fwd')}</button></div></div>`
  :`<div class="mis"><div class="hero">${ic(L.icon)}</div><div class="mt">${ic('target')}${t('mission')}</div><div class="mx">${x.m}</div><div class="mgoal">${x.g}${save.stars[L.id]?` · ${t('best')} ${stars(save.stars[L.id])}`:''}</div><div class="stack" style="max-width:320px"><button class="btn pri" id="sp">${ic('play')}${t('play')}</button><button class="btn ghost" id="sr">${ic('restart')}${t('reread')}</button></div></div>`;
 S.innerHTML=`<div class="sbars">${bars}</div>${top}${body}`;
 storyGo=d=>{const np=cur.p+d;if(np<0||cur.p>=P.length)return;cur.p=np;sfx.tap();if(L.pro&&cur.p>=P.length){goMap();return}renderStory()};
 $('#sx').onclick=()=>{sfx.tap();goMap()};
 if($('#sl'))$('#sl').onclick=()=>{SL[L.id]=cur.lg=nx;sfx.tap();renderStory()};
 if($('#sk'))$('#sk').onclick=()=>{cur.p=P.length;sfx.tap();renderStory()};
 let sx=null,swiped=false;
 if(!mis){$('#sn').onclick=()=>storyGo(1);$('#sb').onclick=()=>storyGo(-1);
  S.onpointerdown=e=>{sx=e.clientX};
  S.onpointerup=e=>{if(sx==null)return;const dx=e.clientX-sx;sx=null;if(Math.abs(dx)>60&&!e.target.closest('button')){swiped=true;storyGo(dx<0?1:-1)}};
  S.onclick=e=>{if(swiped){swiped=false;return}if(e.target.closest('button'))return;const r=S.getBoundingClientRect();storyGo(e.clientX-r.left<r.width*.28?-1:1)}}
 else{S.onclick=S.onpointerdown=S.onpointerup=null;$('#sp').onclick=()=>{sfx.good();startGame(L,i)};$('#sr').onclick=()=>{cur.p=0;renderStory()}}
}

export function startGame(L,i){
 const lg=cur.L===L?cur.lg:lgOf(L);setTL(lg);
 if(!E[L.game.type]){toast(t('gnf'));return}
 G.reset();closeModal();show('s-game');cur={L,i,p:0,lg};
 gst.innerHTML='';gst.className='';gst.lang=lg;gst.style.background=L.gbg;const x=X(L,lg);
 HUD.name(`${x.n} · ${x.g}`);HUD.time(1);HUD.score('');HUD.lives(null);
 if(L.gdeco)gst.appendChild(h('div','gdeco',L.gdeco.map(n=>ic(n)).join('')));
 const rd=h('div','ready',t('ready'));gst.appendChild(rd);
 G.later(()=>{rd.textContent=t('go');sfx.good();buzz(20)},650);
 let fired=false;
 G.later(()=>{rd.remove();E[L.game.type](gst,gcfg(L,lg),res=>{if(fired)return;fired=true;G.reset();showResult(L,i,res)})},1150);
}
export function pauseMenu(){if(screen!=='s-game'||$('#modal').classList.contains('on'))return;G.pause();
 const res=()=>{closeModal();G.resume()};
 const draw=()=>{modal(`<div class="mcard"><div class="rt">${t('paused')}</div><p class="rf">${t('pausedTx')}</p><div class="stack"><button class="btn pri" id="pr">${ic('play')}${t('resume')}</button><div class="row"><button class="btn" id="pq">${ic('restart')}${t('restart')}</button><button class="btn" id="pm">${ic('map')}${t('map')}</button></div><button class="btn ghost" id="ps">${ic(save.snd?'sndOn':'sndOff')}${onOff('sound',save.snd)}</button></div></div>`,res);
  $('#pr').onclick=res;$('#pq').onclick=()=>startGame(cur.L,cur.i);$('#pm').onclick=goMap;$('#ps').onclick=()=>{save.snd=!save.snd;persist();draw();sfx.tap()}};
 draw()}
export function showResult(L,i,res){
 const prev=save.stars[L.id]||0,win=res.stars>0,first=win&&!prev,last=i===LV.length-1,x=X(L,cur.lg),nx=LV[i+1];
 if(win&&res.stars>prev){save.stars[L.id]=res.stars;persist()}
 if(first&&!last)justUnlocked=i+1;
 modal(`<div class="mcard"><div class="rt">${win?t('win'):t('close2')}</div><div class="rst">${ic('star')}${ic('star')}${ic('star')}</div><div class="rl">${res.line}</div>
 ${win?`<div class="fc"><span class="fe">${ic(L.card[0])}</span><div><h4>${first?`<em>${t('newCard')}</em>`:''}${x.c[0]}</h4><p>${x.c[1]}</p></div></div>${first&&nx?`<p class="unl">${ic('sparkle')}${t('unl',{n:nameOf(nx)})}</p>`:''}`:`<p class="rf">${t('fail')}</p>`}
 <div class="stack">${win?`<button class="btn pri" id="rn">${last?ic('globe')+t('lightWorld'):t('cont')+ic('fwd')}</button><div class="row"><button class="btn" id="rr">${ic('restart')}${t('replay')}</button><button class="btn" id="rm">${ic('map')}${t('map')}</button></div>`
 :`<button class="btn pri" id="rr">${ic('restart')}${t('again')}</button><div class="row"><button class="btn" id="rs">${ic('book')}${t('story')}</button><button class="btn" id="rm">${ic('map')}${t('map')}</button></div>`}</div></div>`,goMap);
 $$('#modal .rst .i').forEach((s,k)=>{if(k<res.stars)setTimeout(()=>{s.classList.add('on');sfx.star(k);buzz(25)},400+k*350)});
 if(win)setTimeout(()=>{sfx.win();confetti()},250);else sfx.bad();
 $('#rr').onclick=()=>startGame(L,i);$('#rm').onclick=goMap;
 if(win)$('#rn').onclick=()=>last?finale():goMap();else $('#rs').onclick=()=>openStory(L,i);
}
export function finale(){G.reset();setTL(save.lang);show('s-map');renderMap();const t0=totalStars();
 modal(`<div class="mcard"><div class="hero">${ic('globe')}</div><div class="rt">${t('worldLit')}</div><p class="rf">${t('fin1')}</p><p class="rf"><b>${t('fin2')}</b></p><div class="hap">${Object.keys(LN).map(l=>`<span lang="${l}">${U[l].happy}</span>`).join('<span>·</span>')}</div><div class="rl">${stars(3)} ${t0}/${LV.length*3} ${t('starsW')}</div><div class="stack"><button class="btn pri" id="fs">${ic('share')}${t('share')}</button><button class="btn" id="fm">${ic('map')}${t('backMap')}</button></div></div>`,closeModal);
 sfx.win();confetti();if(!RM){setTimeout(confetti,900);setTimeout(confetti,1800)}
 $('#fs').onclick=()=>share(t0);$('#fm').onclick=closeModal;
}
export function goAlbum(from){G.reset();closeModal();setTL(save.lang);albumBack=from;show('s-album');const S=$('#s-album'),got=LV.filter(l=>save.stars[l.id]>0).length;
 S.innerHTML=`<div class="mhead"><button class="ib" id="ab" aria-label="${t('back')}">${ic('back')}</button><span class="mlogo">${ic('book')}${t('album')}</span><span class="chip">${got}/${LV.length}</span></div><div class="mscroll"><p class="ah">${t('albumH')}</p><div class="ag">${LV.map((l,i)=>{const s=save.stars[l.id]||0,lg=lgOf(l);return`<button class="ac${s?'':' off'}" data-i="${i}"${s?` lang="${lg}"`:''}>${s?ic(l.card[0]):ic('lock')}<span class="at">${s?X(l,lg).c[0]:nameOf(l)}</span>${s?stars(s):''}</button>`}).join('')}</div></div>`;
 $('#ab').onclick=()=>albumBack==='title'?goTitle():goMap();
 $('.ag',S).onclick=e=>{const b=e.target.closest('.ac');if(!b)return;const i=+b.dataset.i,l=LV[i];
  if(!(save.stars[l.id]>0)){sfx.bad();toast(ic('lock')+t('notYet'));return}sfx.tap();const lg=lgOf(l),x=X(l,lg);
  modal(`<div class="mcard" lang="${lg}"><div class="hero" style="animation:none">${ic(l.card[0])}</div><div class="rt" style="font-size:1.35rem">${x.c[0]}</div><div class="rl">${ic('pin')} ${x.w}</div><p class="rf">${x.c[1]}</p><div class="stack" lang="${save.lang}"><button class="btn pri" id="cp">${ic('play')}${t('replayP',{n:nameOf(l)})}</button><button class="btn" id="cc">${t('close')}</button></div></div>`,closeModal);
  $('#cp').onclick=()=>openStory(l,i);$('#cc').onclick=closeModal};
}
export function settings(){setTL(save.lang);modal(`<div class="mcard"><div class="rt">${t('settings')}</div><div class="stack" style="margin-top:16px">
 <button class="btn" id="xl">${ic('globeL')}<span>${t('lang')}: <b lang="${save.lang}">${LN[save.lang]}</b></span></button>
 <button class="btn" id="xs">${ic(save.snd?'sndOn':'sndOff')}<span>${onOff('sound',save.snd)}</span></button>
 <button class="btn" id="xh">${ic(save.hap?'vib':'vibOff')}<span>${onOff('vib',save.hap)}</span></button>
 <button class="btn" id="xb">${ic('text')}<span>${onOff('bigtx',save.big)}</span></button>
 <button class="btn" id="xp">${ic('moon')}${t('prologue')}</button><button class="btn" id="xr">${ic('restart')}${t('reset')}</button><button class="btn pri" id="xc">${t('done')}</button></div></div>`,closeModal);
 $('#xl').onclick=()=>pickLang(()=>{renderMap();settings()});
 $('#xs').onclick=()=>{save.snd=!save.snd;persist();settings();sfx.tap()};
 $('#xh').onclick=()=>{save.hap=!save.hap;persist();buzz(30);settings()};
 $('#xb').onclick=()=>{save.big=!save.big;persist();setUI();renderMap();settings()};
 $('#xp').onclick=()=>openStory(PRO,-1);
 $('#xr').onclick=()=>{modal(`<div class="mcard"><div class="rt">${t('reset')}</div><p class="rf">${t('resetQ')}</p><div class="row"><button class="btn" id="cn">${t('cancel')}</button><button class="btn danger" id="cy">${t('erase')}</button></div></div>`,settings);
  $('#cn').onclick=settings;$('#cy').onclick=()=>{save.stars={};persist();closeModal();renderMap();toast(t('resetOk'))}};
 $('#xc').onclick=closeModal;
}
export async function share(n){const text=t('shareTx',{t:n,m:LV.length*3}),url=location.href;
 if(navigator.share){try{await navigator.share({title:'Deepa Quest',text,url})}catch(e){}return}
 try{await navigator.clipboard.writeText(`${text} ${url}`);toast(ic('check')+t('copied'))}catch(e){toast(t('noCopy'))}}

export function boot(){
let rz=0;window.addEventListener('resize',()=>{cancelAnimationFrame(rz);rz=requestAnimationFrame(()=>{fxSize();if(G.onResize)G.onResize();if(screen==='s-map'&&app.clientWidth!==mapW)renderMap()})});
document.addEventListener('visibilitychange',()=>{if(document.hidden){pauseMenu();suspendAudio()}});
addEventListener('keydown',e=>{const btn=e.target&&e.target.closest&&e.target.closest('button');
 if($('#modal').classList.contains('on')){if(e.key==='Escape'&&escFn){e.preventDefault();escFn()}return}
 if(screen==='s-story'&&cur.L&&cur.p<cur.L.story.length){if(e.key==='ArrowRight'||(!btn&&(e.key===' '||e.key==='Enter'))){e.preventDefault();storyGo(1)}else if(e.key==='ArrowLeft')storyGo(-1);else if(e.key==='Escape')goMap()}
 else if(screen==='s-game'&&(e.key==='Escape'||e.key==='p'))pauseMenu();
 else if((screen==='s-map'||screen==='s-album')&&e.key==='Escape')screen==='s-album'&&albumBack==='title'?goTitle():screen==='s-album'?goMap():goTitle()});
app.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('pointerdown',()=>actx(),{once:true});
$('#g-pause').onclick=pauseMenu;
setUI();fxSize();goTitle();
}
/* test hook: only with ?debug in the URL */
if(new URLSearchParams(location.search).has('debug'))window.DQ={LV,PRO,U,LN,E,G,save,persist,setUI,renderMap,openStory,startGame,showResult,finale,goAlbum,goMap,goTitle,settings,closeModal,cur:()=>cur};
