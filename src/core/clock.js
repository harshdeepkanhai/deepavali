// Split from the original single-file build. Logic unchanged; see openspec/changes/migrate-to-solidjs.
import {$,h,gst,DPR,clamp,RM} from './util.js';
import {ic} from './icons.js';
import {burst} from './fx.js';
/* ---------- pausable game clock ---------- */
export const G={raf:0,tick:null,paused:false,ps:0,off:0,tos:[],cleanup:null,onResize:null,
 now(){return(this.paused?this.ps:performance.now())-this.off},
 loop(fn){cancelAnimationFrame(this.raf);this.tick=fn;const f=()=>{this.raf=requestAnimationFrame(f);if(!this.paused&&this.tick)this.tick(this.now())};this.raf=requestAnimationFrame(f)},
 later(fn,ms){const id=setTimeout(fn,ms);this.tos.push(id);return id},
 reset(){cancelAnimationFrame(this.raf);this.raf=0;this.tick=null;this.tos.forEach(clearTimeout);this.tos=[];this.paused=false;this.off=0;this.onResize=null;gst.classList.remove('paused');const c=this.cleanup;this.cleanup=null;if(c){try{c()}catch(e){}}},
 pause(){if(this.paused)return;this.paused=true;this.ps=performance.now();gst.classList.add('paused')},
 resume(){if(!this.paused)return;this.off+=performance.now()-this.ps;this.paused=false;gst.classList.remove('paused')}
};
export const gBar=$('#g-bar'),gTime=$('#g-time'),gScore=$('#g-score'),gLives=$('#g-lives'),gName=$('#g-name');let hT='',hLow=null;
export const HUD={
 name:t=>{gName.textContent=t},
 time:f=>{if(f==null){gBar.style.visibility='hidden';return}gBar.style.visibility='visible';const v=clamp(f,0,1),s=v.toFixed(3);if(s!==hT){hT=s;gTime.style.transform=`scaleX(${s})`}const lo=v<.25;if(lo!==hLow){hLow=lo;gBar.classList.toggle('low',lo)}},
 score:t=>{gScore.innerHTML=t;gScore.style.display=t?'':'none'},
 lives:n=>{if(n==null){gLives.style.display='none';return}gLives.style.display='';gLives.innerHTML=n>0?ic('heart').repeat(n):ic('heart','off')}
};
export function pop(t,x,y,c){const e=h('div','pop '+(c||'good'),t);e.style.left=x+'px';e.style.top=y+'px';gst.appendChild(e);setTimeout(()=>e.remove(),950)}
export function flash(col){if(RM)return;const e=h('div','flash');e.style.background=col||'#ff2d55';gst.appendChild(e);setTimeout(()=>e.remove(),420)}
export function shakeEl(el){if(RM)return;el.classList.remove('shakeit');void el.offsetWidth;el.classList.add('shakeit')}
export function burstAt(x,y,n,cols){const r=gst.getBoundingClientRect();burst(r.left+x,r.top+y,n,cols)}
export function makeCanvas(el){const c=h('canvas','cv');el.appendChild(c);const ctx=c.getContext('2d'),K={c,ctx,W:0,H:0,fit(){const r=el.getBoundingClientRect();K.W=r.width;K.H=r.height;c.width=Math.round(r.width*DPR);c.height=Math.round(r.height*DPR);ctx.setTransform(DPR,0,0,DPR,0,0)}};K.fit();G.onResize=K.fit;return K}
