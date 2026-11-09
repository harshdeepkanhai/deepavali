// The journey course: one island per place and a themed stretch of platforms between each pair,
// laid out from the table below (design.md, decision 7). Deterministic, so the order of the
// diyas is stable and their lit state can be saved as one bitmask per place.
//
// Jump reach for these numbers: about 1.6 up and 4 across at a full run. Bounce pads go higher.

/** One platform in a stretch, measured from the end of the previous one. */
interface Spec {
  g: number;       // gap before it, along the path
  l: number;       // length along the path (discs: diameter)
  w?: number;      // width across the path (boxes; defaults to l)
  s?: number;      // sideways offset of its centre
  r?: number;      // rise of its top relative to the previous platform
  d?: 1;           // disc instead of box
  p?: number;      // bounce pad: launch speed
  m?: [axis: number, amp: number, period: number, phase?: number]; // moves: 0 across, 1 up, 2 along
  sp?: number;     // spins, radians per second
  n?: number;      // diyas standing on it
  a?: number;      // diyas floating over the gap before it
  cp?: 1;          // checkpoint
}
interface Stretch { style: string; head: number; p: Spec[]; end: { g: number; r?: number } }

// Stretch i leads from place i to place i + 1, themed for where the player is going.
const STRETCHES: Stretch[] = [
  { style: 'stone', head: 0, end: { g: 1.6, r: 0.4 }, p: [ // Ayodhya to Govardhan: river stones
    { g: 1.2, l: 2.8, n: 1 }, { g: 1.3, l: 2.6, s: 0.8, n: 1 }, { g: 1.5, l: 2.5, s: -0.6, r: 0.4, a: 1 },
    { g: 1.7, l: 2.8, w: 2.4, s: 0.4, r: 0.4, n: 2, cp: 1 }, { g: 1.6, l: 2.4, s: -0.5, r: -0.2, a: 1 }] },
  { style: 'grass', head: 0.5, end: { g: 1.6, r: -0.8 }, p: [ // to Pawapuri: Govardhan hill steps
    { g: 1.2, l: 2.6, d: 1, r: 0.6, n: 1 }, { g: 1.3, l: 2.4, d: 1, s: 1.2, r: 0.8, n: 1 },
    { g: 1.3, l: 2.4, d: 1, s: -0.8, r: 0.8, n: 1 }, { g: 1.5, l: 2.0, d: 1, p: 15 },
    { g: 1.2, l: 3.2, w: 3, r: 3.2, n: 3, cp: 1 }, { g: 1.6, l: 2.4, d: 1, r: -0.6, a: 1 }] },
  { style: 'lotus', head: 0.1, end: { g: 1.4 }, p: [ // to Amritsar: lotus pond
    { g: 1.0, l: 2.4, d: 1, n: 1 }, { g: 1.3, l: 2.2, d: 1, s: 1.4, n: 1 },
    { g: 1.3, l: 2.4, d: 1, s: -1.0, m: [0, 1.6, 4] }, { g: 1.4, l: 2.2, d: 1, s: 0.8, n: 1, cp: 1 },
    { g: 1.4, l: 2.6, d: 1, s: -0.6, n: 2, a: 1 }] },
  { style: 'wood', head: -0.5, end: { g: 1.6 }, p: [ // to Kolkata: boats on the river
    { g: 1.2, l: 2.4, w: 2.2, n: 1 }, { g: 1.5, l: 2.8, w: 1.9, m: [0, 2.2, 5] },
    { g: 1.5, l: 2.8, w: 1.9, m: [0, 2.2, 5, Math.PI], a: 1 }, { g: 1.4, l: 2.6, n: 2, cp: 1 },
    { g: 1.5, l: 2.6, w: 1.9, m: [2, 1.0, 4] }, { g: 1.6, l: 2.4, n: 1 }] },
  { style: 'drum', head: -0.1, end: { g: 1.6, r: -1.0 }, p: [ // to Goa: dhak drums that bounce
    { g: 1.2, l: 2.4, d: 1, r: 0.5, n: 1 }, { g: 1.4, l: 2.0, d: 1, p: 13 },
    { g: 1.6, l: 2.6, d: 1, r: 2.6, n: 2, cp: 1 }, { g: 1.5, l: 2.2, d: 1, r: -0.6, n: 1 },
    { g: 1.4, l: 2.0, d: 1, p: 13 }, { g: 1.8, l: 2.8, d: 1, r: 2.0, n: 2 }] },
  { style: 'rangoli', head: 0.45, end: { g: 1.5 }, p: [ // to Gujarat: spinning rangoli
    { g: 1.2, l: 2.6, n: 1 }, { g: 1.4, l: 3.8, d: 1, sp: 0.9, n: 2 },
    { g: 1.4, l: 3.8, d: 1, sp: -1.1, s: 1.0, cp: 1 }, { g: 1.4, l: 3.4, d: 1, sp: 1.3, s: -0.8, n: 2 }] },
  { style: 'snow', head: 0, end: { g: 1.5, r: 0.6 }, p: [ // to Nepal: up the mountain path
    { g: 1.2, l: 2.4, w: 2.2, r: 0.9, n: 1 }, { g: 1.2, l: 2.2, w: 2.0, s: 1.2, r: 1.0, n: 1 },
    { g: 1.2, l: 2.2, w: 2.0, s: -0.4, r: 1.0, a: 1 }, { g: 1.3, l: 2.8, s: -1.4, r: 0.8, n: 2, cp: 1 },
    { g: 1.3, l: 2.2, w: 1.9, s: -0.2, r: 1.0, m: [1, 0.8, 3.5] }, { g: 1.3, l: 2.4, w: 2.2, s: 1.0, r: 1.0, n: 1 }] },
  { style: 'rock', head: -0.45, end: { g: 1.6, r: -0.8 }, p: [ // to Kala Pani: down to the sea
    { g: 1.4, l: 2.6, r: -1.2, n: 1 }, { g: 1.6, l: 2.4, s: 1.0, r: -1.4, n: 1 },
    { g: 1.6, l: 2.4, s: -1.0, r: -1.4, n: 1, cp: 1 }, { g: 1.6, l: 3.0, w: 1.9, r: -1.0, m: [2, 1.4, 4.5], a: 1 },
    { g: 1.6, l: 2.6, r: -1.0, n: 1 }] },
  { style: 'crate', head: -0.1, end: { g: 1.5 }, p: [ // to Trinidad: crates on the ocean
    { g: 1.3, l: 2.2, m: [1, 0.5, 3] }, { g: 1.4, l: 2.2, s: 1.2, m: [1, 0.6, 3.4, 1.5], a: 1 },
    { g: 1.4, l: 2.8, s: -0.4, n: 2, cp: 1 }, { g: 1.4, l: 2.2, s: -1.4, m: [0, 1.4, 4] },
    { g: 1.5, l: 2.2, s: 0.6, m: [1, 0.6, 3, 0.8], a: 1 }, { g: 1.4, l: 2.4, n: 1 }] },
  { style: 'bamboo', head: 0.4, end: { g: 1.5 }, p: [ // to Malaysia: bamboo bridges
    { g: 1.2, l: 5.0, w: 1.0, n: 2 }, { g: 1.4, l: 2.2, s: 0.8, r: 0.6, n: 1 },
    { g: 1.2, l: 5.0, w: 0.9, s: 0.8, n: 2, cp: 1 }, { g: 1.4, l: 2.4, s: -0.4, r: 0.8, m: [1, 0.9, 4] },
    { g: 1.4, l: 4.6, w: 0.9, s: -0.4, r: 0.4, n: 2 }] },
  { style: 'roof', head: 0, end: { g: 1.6 }, p: [ // to Leicester: city rooftops
    { g: 1.3, l: 3.0, r: 0.8, n: 1 }, { g: 1.6, l: 2.6, s: -1.0, r: -0.6, n: 1 },
    { g: 1.4, l: 2.0, d: 1, s: -1.0, p: 14 }, { g: 1.8, l: 3.0, s: 0.6, r: 3.0, n: 2, cp: 1 },
    { g: 1.8, l: 2.6, s: 1.2, r: -0.8, a: 1 }, { g: 1.6, l: 2.6, r: -0.6, m: [0, 1.6, 4.4] }] },
  { style: 'glow', head: -0.3, end: { g: 1.4, r: 0.6 }, p: [ // to the finale: steps into the sky
    { g: 1.2, l: 2.4, d: 1, r: 0.9, n: 1 }, { g: 1.2, l: 2.2, d: 1, s: 1.4, r: 0.9, n: 1 },
    { g: 1.2, l: 2.2, d: 1, s: -0.2, r: 0.9, m: [0, 1.6, 4] }, { g: 1.2, l: 3.2, d: 1, s: -1.2, r: 0.9, sp: 0.8, n: 2, cp: 1 },
    { g: 1.2, l: 2.2, d: 1, s: 0.2, r: 0.9, a: 1 }, { g: 1.2, l: 2.2, d: 1, s: 1.4, r: 0.9, m: [1, 0.7, 3.2] },
    { g: 1.2, l: 2.6, d: 1, s: 0.2, r: 0.9, n: 1 }] },
];

export interface Plat {
  zone: number;                 // the place this stretch leads to
  disc: boolean;
  x: number; y: number; z: number;  // top centre at rest
  len: number; wid: number;     // along / across the path (discs: len = diameter)
  ux: number; uz: number;       // path direction
  thick: number;
  style: string;
  pad: number;
  move: [number, number, number, number] | null;
  spin: number;
  cp: boolean;
}
export interface Hub { x: number; y: number; z: number; r: number; inX: number; inZ: number; outX: number; outZ: number }
export interface Lamp { zone: number; x: number; y: number; z: number }
export interface Course { hubs: Hub[]; plats: Plat[]; lamps: Lamp[] }

export const HUB_R = 6, LAST_R = 7, HUB_LAMPS = 4;

export function buildCourse(n: number): Course {
  const hubs: Hub[] = [], plats: Plat[] = [], lamps: Lamp[] = [];
  let x = 0, y = 0, z = 0, inX = 0, inZ = -1;
  for (let i = 0; i < n; i++) {
    const st = STRETCHES[Math.min(i, STRETCHES.length - 1)], R = i === n - 1 ? LAST_R : HUB_R;
    const last = i === n - 1, ux = last ? inX : Math.sin(st.head), uz = last ? inZ : -Math.cos(st.head);
    hubs.push({ x, y, z, r: R, inX, inZ, outX: ux, outZ: uz });
    // Four diyas around the story circle, between the way in and the way out.
    for (let k = 0; k < HUB_LAMPS; k++) {
      const a = Math.atan2(uz, ux) + Math.PI / 4 + (k * Math.PI) / 2;
      lamps.push({ zone: i, x: x + Math.cos(a) * 3.4, y, z: z + Math.sin(a) * 3.4 });
    }
    if (last) break;
    const vx = -uz, vz = ux;
    let a = R, top = y, prevS = 0;
    for (const p of st.p) {
      const half = p.l / 2, s = p.s || 0, gapStart = a;
      a += p.g + half;
      const prevTop = top;
      top += p.r || 0;
      const px = x + ux * a + vx * s, pz = z + uz * a + vz * s;
      plats.push({ zone: i + 1, disc: !!p.d, x: px, y: top, z: pz, len: p.l, wid: p.w || p.l, ux, uz,
        thick: p.p ? 0.5 : 0.7, style: st.style, pad: p.p || 0,
        move: p.m ? [p.m[0], p.m[1], p.m[2], p.m[3] || 0] : null, spin: p.sp || 0, cp: !!p.cp });
      for (let k = 0; k < (p.n || 0); k++) {
        const o = (k - ((p.n || 1) - 1) / 2) * Math.min(1.1, p.l / ((p.n || 1) + 0.6));
        lamps.push({ zone: i + 1, x: px + ux * o, y: top, z: pz + uz * o });
      }
      // Floating diyas trace the jump across the gap: collect them mid-air.
      for (let k = 0; k < (p.a || 0); k++) {
        const m = gapStart + p.g / 2 + 0.3, ms = (prevS + s) / 2, ax = x + ux * m + vx * ms, az = z + uz * m + vz * ms;
        lamps.push({ zone: i + 1, x: ax, y: Math.max(prevTop, top) + 1.1, z: az });
      }
      a += half;
      prevS = s;
    }
    const nextR = i + 1 === n - 1 ? LAST_R : HUB_R;
    a += st.end.g + nextR;
    x += ux * a; z += uz * a; y = top + (st.end.r || 0);
    inX = ux; inZ = uz;
  }
  return { hubs, plats, lamps };
}
