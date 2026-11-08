// Split from the original single-file build. Logic unchanged; see openspec/changes/migrate-to-solidjs.
import {save} from './save.js';
/* ---------- sound + haptics (pure Web Audio, no files) ---------- */
export let AC=null;
export function actx(){if(!AC){const C=window.AudioContext||window.webkitAudioContext;if(C){try{AC=new C()}catch(e){}}}if(AC&&AC.state==='suspended')AC.resume();return AC}
export function tone(f,d,type,v,delay,slide){if(!save.snd)return;const a=actx();if(!a)return;const t=a.currentTime+(delay||0),o=a.createOscillator(),g=a.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(slide,t+d);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v||.1,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+d+.05)}
export const sfx={
 tap:()=>{tone(880,.08,'triangle',.09);tone(1320,.1,'sine',.05,.03)},
 good:()=>{tone(660,.1,'sine',.11);tone(990,.16,'sine',.09,.07)},
 bad:()=>tone(200,.25,'sawtooth',.07,0,90),
 drum:()=>tone(150,.2,'sine',.3,0,55),
 tick:()=>tone(1700,.03,'square',.025),
 thunder:()=>tone(70,.7,'sawtooth',.05,0,35),
 bell:i=>tone([523,587,659,784,880,1047][i%6],.32,'triangle',.12),
 star:i=>tone(880+i*220,.25,'sine',.12),
 whoosh:()=>tone(400,.14,'sine',.04,0,1200),
 win:()=>[523,659,784,1047].forEach((f,i)=>tone(f,.3,'triangle',.1,i*.11))
};
export const buzz=ms=>{if(save.hap&&navigator.vibrate){try{navigator.vibrate(ms)}catch(e){}}};

export function suspendAudio(){if(AC&&AC.state==='running')AC.suspend()}
