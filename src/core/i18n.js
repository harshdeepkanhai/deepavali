// Split from the original single-file build. Logic unchanged; see openspec/changes/migrate-to-solidjs.
import {any} from './util.js';
import {save} from './save.js';
import {LN,U} from '../data/strings.js';
export {LN,U};
if(!LN[save.lang]){const n=(navigator.languages||[navigator.language||'en']).map(l=>String(l).slice(0,2).toLowerCase()).find(l=>LN[l]);save.lang=n||'en'}
export let TL=save.lang;export const getTL=()=>TL,setTL=v=>{TL=v}; // language t() speaks right now: the UI language, or the story language inside a level
export const t=(k,v)=>{let s=U[TL]&&U[TL][k];if(s==null)s=U.en[k];if(s==null)return k;if(Array.isArray(s))s=any(s);return v?s.replace(/\{(\w)\}/g,(m,x)=>v[x]!=null?v[x]:m):s};
/* level text in a given language (English fallback per field) */
export function X(L,lg){const o=(lg!=='en'&&L.tr&&L.tr[lg])||{},c=L.card||[];
 return{n:o.n||L.name,w:o.w||L.where,s:L.story.map((p,i)=>(o.s&&o.s[i])||p[1]),m:o.m||L.mission,g:o.g||L.goalText,u:o.u||(L.game&&L.game.unit),c:o.c||[c[1],c[2]],x:o.x}}
export const nameOf=L=>(L.tr&&L.tr[save.lang]&&L.tr[save.lang].n)||L.name;
export const langsOf=L=>{const a=['en'];if(save.lang!=='en'&&L.tr&&L.tr[save.lang])a.push(save.lang);(L.ll||[]).forEach(l=>{if(!a.includes(l))a.push(l)});return a};
export const SL={}; // story language picked per place (this session)
export const lgOf=L=>{const a=langsOf(L);return a.includes(SL[L.id])?SL[L.id]:(a[1]===save.lang?save.lang:'en')};
export function gcfg(L,lg){const c=Object.assign({},L.game),x=X(L,lg);c.unit=x.u;const o=x.x;
 if(o){if(c.cards)c.cards=c.cards.map((k,i)=>o[i]?[k[0],o[i][0],k[2],o[i][1]]:k);if(c.items)c.items=c.items.map((k,i)=>o[i]||k);if(c.pairs)c.pairs=c.pairs.map((k,i)=>o[i]||k)}return c}
