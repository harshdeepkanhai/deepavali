// Split from the original single-file build. Logic unchanged; see openspec/changes/migrate-to-solidjs.
export const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
export const rnd=(a,b)=>a+Math.random()*(b-a),ri=(a,b)=>Math.floor(rnd(a,b+1)),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
export const any=a=>a[Math.floor(Math.random()*a.length)];
export const h=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.innerHTML=x;return e};
export const app=$('#app'),gst=$('#g-stage'),DPR=Math.min(2,window.devicePixelRatio||1);
export const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
