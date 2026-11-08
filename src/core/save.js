// Split from the original single-file build. Logic unchanged; see openspec/changes/migrate-to-solidjs.
/* ---------- save ---------- */
export const KEY='deepa-quest-v2',save={stars:{},snd:true,hap:true,seen:false,lang:'',big:false};
try{Object.assign(save,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){}
export const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(save))}catch(e){}};
