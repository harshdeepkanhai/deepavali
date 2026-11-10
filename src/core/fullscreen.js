/* Full screen in landscape on touch devices (openspec/changes/play-full-screen-in-landscape).
   Browsers allow full screen only during a tap, so one capture-phase listener uses the tap that
   starts play, and the next tap after the player leaves full screen. Never with a mouse, never on
   the account screen (passkey dialogs), never from buttons that need the tap themselves (data-nofs):
   asking for full screen uses up the tap in some browsers. iPhone Safari has no page full screen. */
const de=document.documentElement;
export function fullLandscape(){
 if(document.fullscreenElement||!de.requestFullscreen||!matchMedia('(pointer: coarse)').matches)return;
 const lock=()=>{try{const o=screen.orientation;if(o&&o.lock)o.lock('landscape').catch(()=>{})}catch(e){/* not supported */}};
 try{const p=de.requestFullscreen({navigationUI:'hide'});if(p&&p.then)p.then(lock,()=>{})}catch(e){/* refused */}
}
export function initFullscreen(){
 document.addEventListener('click',e=>{const el=e.target instanceof Element?e.target:null;
  if(el&&el.closest('#s-account,[data-nofs]'))return;fullLandscape()},true);
}
