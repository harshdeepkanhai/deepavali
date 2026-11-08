// Split from the original single-file build. Logic unchanged; see openspec/changes/migrate-to-solidjs.
import {$,app,DPR,RM,rnd} from './util.js';
/* ---------- particles ---------- */
export const fx=$('#fx'),fc=fx.getContext('2d');let parts=[],fxRun=false,fxT=0;
export function fxSize(){const r=app.getBoundingClientRect();fx.width=Math.round(r.width*DPR);fx.height=Math.round(r.height*DPR);fc.setTransform(DPR,0,0,DPR,0,0)}
export function burst(cx,cy,n,cols){const r=app.getBoundingClientRect(),x=cx-r.left,y=cy-r.top;cols=cols||['#ffd166','#ff8a1f','#fff3b0','#ff5d7a'];n=Math.round((n||14)*(RM?.4:1));
 for(let i=0;i<n;i++){const a=Math.random()*6.283,s=rnd(90,330);parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-80,l:1,d:rnd(.45,.95),c:cols[i%cols.length],r:rnd(2,4.6)})}
 if(!fxRun){fxRun=true;fxT=performance.now();requestAnimationFrame(fxLoop)}}
export function fxLoop(t){const dt=Math.min(.05,(t-fxT)/1000);fxT=t;fc.clearRect(0,0,fx.width,fx.height);
 parts=parts.filter(p=>(p.l-=dt/p.d)>0);
 for(const p of parts){p.vy+=520*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;fc.globalAlpha=p.l;fc.fillStyle=p.c;fc.beginPath();fc.arc(p.x,p.y,p.r,0,6.283);fc.fill()}
 fc.globalAlpha=1;if(parts.length)requestAnimationFrame(fxLoop);else{fxRun=false;fc.clearRect(0,0,fx.width,fx.height)}}
export function confetti(){const r=app.getBoundingClientRect();for(let i=0;i<(RM?2:6);i++)setTimeout(()=>burst(r.left+rnd(.15,.85)*r.width,r.top+rnd(.12,.45)*r.height,24,['#ffd166','#ff5d7a','#4fdc9b','#7cc6ff','#c084fc','#fff']),i*150)}
