// The journey as a landscape, third-person 3D platformer (openspec change build-3d-journey-platformer).
// One continuous course through every place: run, jump, light diyas, and step into a place's story
// circle to open its story. Gates of light follow the usual unlock rule, falls return the player to
// the last checkpoint, and fast travel keeps every unlocked story one tap away. Rendering stops
// whenever a story, game or menu covers the world.
import {
  BufferGeometry, CircleGeometry, Color, ConeGeometry, DirectionalLight, Float32BufferAttribute, Fog,
  DoubleSide, Group, HemisphereLight, InstancedMesh, Material, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PerspectiveCamera,
  PlaneGeometry, Points, PointsMaterial, Scene, SpriteMaterial, Vector3, WebGLRenderer,
} from 'three';
import { ic, stars } from '../core/icons.js';
import { buzz, sfx, tone } from '../core/audio.js';
import { bowlGeometry, flameGeometry, glowPoints, jyoti, light } from './kit';
import { buildCourse, type Hub } from './course';
import { beacon, FOOT, gate, island, landmark, lampPost, platformMesh, props, storyCircle } from './places';
import { hero } from './hero';
import { controls } from './controls';

export interface PlaceInfo { id: string; icon: string; color: string }
export interface PlaceState { name: string; sub: string; subLang: string; stars: number; locked: boolean }
export interface Labels { play: string; jump: string; map: string; album: string; settings: string; home: string; lit: string; rotate: string; close: string }
export interface WorldData {
  places: PlaceState[];
  cur: number;              // the next place to play: the beacon stands there
  justUnlocked: number;     // > 0: build the bridge to this place
  total: string;            // stars, e.g. "12/39"
  lit: Record<string, number>;
  labels: Labels;
  reduced: boolean;         // prefers-reduced-motion
  force: boolean;           // skip the frame-time probe (tests)
  busy(): boolean;          // a menu covers the world
  onOpen(i: number): void;
  onLocked(): void;
  onSlow(): void;           // too slow even at the lowest resolution: 2D from now on
  onLost(): void;           // the GPU was taken away and not given back: 2D for this visit
  onLit(id: string, mask: number): void;
  onMap(): void;
  onAlbum(): void;
  onSettings(): void;
  onHome(): void;
}
export interface WorldState {
  x: number; y: number; z: number; zone: number; grounded: boolean; circle: number; lit: number; open: boolean[];
  next: number[] | null;    // the nearest unlit diya that can be reached (tests)
}
export interface World {
  show(d: WorldData): void;
  hide(): void;             // stop and dim behind a story, game or menu
  off(): void;              // remove from view (2D fallback)
  travel(i: number): void;
  state(): WorldState;
  put(x: number, y: number, z: number): void;
}

interface Col {
  zone: number; disc: boolean; solid: boolean; on: boolean;
  x: number; y: number; z: number;        // top centre now
  bx: number; by: number; bz: number;     // at rest
  r: number; hl: number; hw: number; ux: number; uz: number; thick: number;
  pad: number; spin: number; move: [number, number, number, number] | null;
  dx: number; dy: number; dz: number;
  lift: number;                           // drawn this far below its place (bridge rising)
  node: Object3D | null;
  hub: number; gate: number;
  cp: ReturnType<typeof lampPost> | null;
}

const NIGHT = '#140b24', SCALE = 2.4, RIM = 18;
const SPEED = 6.2, JUMP = 9.2, GRAV = 26, FALL = 30, COYOTE = 0.12, BUFFER = 0.14, STEP = 0.32, RAD = 0.32, HEIGHT = 1.45;
const LOOK = 0.0075;

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const turnTo = (a: number, b: number, k: number) => a + wrap(b - a) * Math.min(1, k);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const easeOut = (k: number) => 1 - (1 - k) * (1 - k) * (1 - k);
const FAR = -9999;

/** A small pool of additive particles: fireworks in the sky and sparkles when a diya lights. */
function particles(slots: number, per: number, size: number) {
  const pts = glowPoints(slots * per, size);
  const geo = pts.geometry, pos = geo.getAttribute('position').array as Float32Array;
  const col = new Float32Array(slots * per * 3);
  geo.setAttribute('color', new Float32BufferAttribute(col, 3));
  const m = pts.material as PointsMaterial;
  m.vertexColors = true;
  m.fog = false;
  m.needsUpdate = true;
  pts.frustumCulled = false;
  for (let i = 0; i < slots * per; i++) pos[i * 3 + 1] = FAR;
  const bursts: { x: number; y: number; z: number; t0: number; life: number; g: number; v: Float32Array; c: Color }[] = [];
  let next = 0;
  return {
    pts,
    fire(x: number, y: number, z: number, t: number, speed: number, life: number, color: string, g = -3) {
      const v = new Float32Array(per * 3);
      for (let k = 0; k < per; k++) {
        const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u), sp = speed * (0.7 + Math.random() * 0.3);
        v[k * 3] = Math.cos(a) * s * sp; v[k * 3 + 1] = u * sp; v[k * 3 + 2] = Math.sin(a) * s * sp;
      }
      bursts[next] = { x, y, z, t0: t, life, g, v, c: new Color(color) };
      next = (next + 1) % slots;
    },
    update(t: number) {
      for (let b = 0; b < slots; b++) {
        const B = bursts[b];
        const age = B ? t - B.t0 : 1e9, alive = B && age < B.life, f = alive ? (1 - age / B.life) ** 2 : 0;
        for (let k = 0; k < per; k++) {
          const i = (b * per + k) * 3;
          if (!alive) { pos[i + 1] = FAR; continue; }
          pos[i] = B.x + B.v[k * 3] * age;
          pos[i + 1] = B.y + B.v[k * 3 + 1] * age + 0.5 * B.g * age * age;
          pos[i + 2] = B.z + B.v[k * 3 + 2] * age;
          col[i] = B.c.r * f; col[i + 1] = B.c.g * f; col[i + 2] = B.c.b * f;
        }
      }
      geo.getAttribute('position').needsUpdate = true;
      geo.getAttribute('color').needsUpdate = true;
    },
  };
}

export function createWorld(info: PlaceInfo[]): World {
  const N = info.length, course = buildCourse(N), hubs = course.hubs;
  const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  const top = Math.min(window.devicePixelRatio || 1, 1.5), DPRS = [top, 1, 0.75].filter((v, i) => i === 0 || v < top);
  let q = 0;
  renderer.setPixelRatio(DPRS[0]);

  // ---------- DOM: canvas, input layer, HUD ----------
  const root = document.createElement('div');
  root.className = 'w3d';
  root.hidden = true;
  const cv = renderer.domElement;
  cv.className = 'w3d-cv';
  cv.setAttribute('aria-hidden', 'true');
  let d: WorldData | null = null, active = false;
  const enabled = () => active && !!d && !d.busy() && !respawning && !dropping;
  const ctl = controls('', () => d && enabled() && d.onMap(), enabled);
  const hud = document.createElement('div');
  hud.className = 'w3-hud';
  hud.innerHTML = `<div class="w3-top"><div class="w3-place"><span class="w3-pi"></span><span class="w3-pn"><b></b><small></small></span><span class="w3-ps"></span></div>
<span class="chip w3-st"></span><span class="chip w3-lit"></span><span class="w3-gap"></span>
<button class="ib" type="button" data-a="map">${ic('map')}</button><button class="ib" type="button" data-a="album">${ic('book')}</button><button class="ib" type="button" data-a="settings">${ic('sliders')}</button><button class="ib" type="button" data-a="home">${ic('home')}</button></div>
<div class="w3-banner"><b></b><small></small></div>
<div class="w3-rot" hidden><span class="w3-ph">${ic('phone')}</span><p></p><button class="btn" type="button" data-a="rot"></button></div>
<div class="w3-fade"></div>`;
  root.append(cv, ctl.el, hud);
  document.body.appendChild(root);
  const $ = <T extends HTMLElement>(s: string) => hud.querySelector(s) as T;
  const hPi = $('.w3-pi'), hPn = $('.w3-pn b'), hPs = $('.w3-pn small'), hStars = $('.w3-ps'), hTotal = $('.w3-st'), hLit = $('.w3-lit');
  const banner = $('.w3-banner'), rot = $('.w3-rot'), fade = $('.w3-fade');
  let rotDismissed = false;
  hud.addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
    if (!b || !d) return;
    b.blur();
    const a = b.dataset.a;
    if (a === 'rot') { rotDismissed = true; rotHint(); return; }
    if (!enabled()) return;
    if (a === 'map') d.onMap(); else if (a === 'album') d.onAlbum(); else if (a === 'settings') d.onSettings(); else if (a === 'home') d.onHome();
  });

  // ---------- scene ----------
  const scene = new Scene();
  scene.background = new Color(NIGHT);
  scene.fog = new Fog(NIGHT, 26, 72);
  const camera = new PerspectiveCamera(60, 1, 0.1, 170);
  scene.add(new HemisphereLight('#c8c0ff', '#3a1d4a', 2.3));
  const sun = new DirectionalLight('#ffd9a0', 1.6);
  sun.position.set(6, 14, 9);
  scene.add(sun);

  // Sky: stars on a dome and mountain silhouettes that travel with the camera (Amavasya: no moon).
  const sky = new Group();
  const sp = new Float32Array(1100 * 3);
  for (let i = 0; i < 1100; i++) {
    const a = Math.random() * Math.PI * 2, y = Math.random() * 1.05 - 0.05, r = Math.sqrt(1 - y * y) * 140;
    sp.set([Math.cos(a) * r, y * 140, Math.sin(a) * r], i * 3);
  }
  const starGeo = new BufferGeometry();
  starGeo.setAttribute('position', new Float32BufferAttribute(sp, 3));
  const starPts = new Points(starGeo, new PointsMaterial({ color: '#fff4e0', size: 1.7, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.9, depthWrite: false }));
  starPts.frustumCulled = false;
  sky.add(starPts);
  const hill = new MeshBasicMaterial({ color: '#21143a', fog: false });
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2, h = 26 + ((i * 7) % 5) * 7, m = new Mesh(new ConeGeometry(16 + (i % 3) * 5, h, 5), hill);
    m.position.set(Math.cos(a) * 120, -48 + h / 2, Math.sin(a) * 120);
    sky.add(m);
  }
  scene.add(sky);
  const lowY = Math.min(...hubs.map(h => h.y));
  const sea = new Mesh(new PlaneGeometry(700, 700), new MeshBasicMaterial({ color: '#0d1a36' }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = lowY - 18;
  scene.add(sea);

  // ---------- course: islands, landmarks, gates, platforms ----------
  const zones: Group[] = [], cols: Col[][] = [], stretch: Col[][] = [];
  for (let i = 0; i < N; i++) { const g = new Group(); zones.push(g); scene.add(g); cols.push([]); stretch.push([]); }
  const addCol = (c: Partial<Col> & { zone: number; x: number; y: number; z: number }): Col => {
    const col: Col = {
      disc: true, solid: false, on: true, r: 0, hl: 0, hw: 0, ux: 0, uz: -1, thick: 0.7, pad: 0, spin: 0, move: null,
      dx: 0, dy: 0, dz: 0, lift: 0, node: null, hub: -1, gate: -1, cp: null, bx: c.x, by: c.y, bz: c.z, ...c,
    };
    cols[col.zone].push(col);
    return col;
  };
  const circles: ReturnType<typeof storyCircle>[] = [], gates: (ReturnType<typeof gate> | null)[] = [];
  const rim: number[][] = [];
  hubs.forEach((h, i) => {
    const g = zones[i];
    const isl = island(h.r, info[i].color);
    isl.position.set(h.x, h.y, h.z);
    g.add(isl);
    addCol({ zone: i, x: h.x, y: h.y, z: h.z, r: h.r, thick: 0.8, hub: i });
    // The landmark stands to one side, facing the story circle.
    const mx = h.inX + h.outX, mz = h.inZ + h.outZ, ml = Math.hypot(mx, mz) || 1, side = i % 2 ? -1 : 1;
    const wx = (-mz / ml) * side, wz = (mx / ml) * side;
    const lm = landmark(info[i].id);
    lm.scale.setScalar(SCALE);
    lm.position.set(h.x + wx * 3.4, h.y, h.z + wz * 3.4);
    lm.rotation.y = Math.atan2(-wx, -wz);
    g.add(lm);
    const [fr, fh] = FOOT[info[i].id] || [0.6, 1.4];
    addCol({ zone: i, solid: true, x: lm.position.x, y: h.y + fh * SCALE, z: lm.position.z, r: fr * SCALE, thick: fh * SCALE });
    const sc = storyCircle(info[i].color, info[i].icon);
    sc.root.position.set(h.x, h.y, h.z);
    g.add(sc.root);
    circles.push(sc);
    const pr = props(info[i].id, h.r);
    pr.position.set(h.x, h.y, h.z);
    g.add(pr);
    const aIn = Math.atan2(-h.inZ, -h.inX), aOut = Math.atan2(h.outZ, h.outX);
    for (let k = 0; k < RIM; k++) {
      const a = (k / RIM) * Math.PI * 2;
      if ((i > 0 && Math.abs(wrap(a - aIn)) < 0.42) || (i < N - 1 && Math.abs(wrap(a - aOut)) < 0.5)) continue;
      rim.push([h.x + Math.cos(a) * (h.r - 0.45), h.y, h.z + Math.sin(a) * (h.r - 0.45)]);
    }
    if (i < N - 1) {
      const gt = gate(), gx = h.x + h.outX * (h.r - 0.7), gz = h.z + h.outZ * (h.r - 0.7);
      gt.root.position.set(gx, h.y, gz);
      gt.root.rotation.y = -Math.atan2(h.outX, -h.outZ);
      g.add(gt.root);
      gt.curtain.visible = gt.lock.visible = false;
      gates.push(gt);
      addCol({ zone: i + 1, disc: false, solid: true, x: gx, y: h.y + 3.3, z: gz, hl: 0.35, hw: 2.4, ux: h.outX, uz: h.outZ, thick: 3.3, gate: i + 1, on: false });
      for (const s of [-2, 2]) addCol({ zone: i, solid: true, x: gx - h.outZ * s, y: h.y + 3.4, z: gz + h.outX * s, r: 0.3, thick: 3.4 });
    } else gates.push(null);
  });
  course.plats.forEach(p => {
    const node = platformMesh(p);
    node.position.set(p.x, p.y, p.z);
    zones[p.zone].add(node);
    const c = addCol({ zone: p.zone, disc: p.disc, x: p.x, y: p.y, z: p.z, r: p.len / 2, hl: p.len / 2, hw: p.wid / 2, ux: p.ux, uz: p.uz,
      thick: p.thick, pad: p.pad, spin: p.spin, move: p.move, node });
    if (p.cp) {
      const lp = lampPost();
      if (p.disc) lp.root.position.set(-p.uz * (p.len / 2 - 0.35), 0, p.ux * (p.len / 2 - 0.35));
      else lp.root.position.set(p.wid / 2 - 0.3, 0, 0);
      node.add(lp.root);
      c.cp = lp;
    }
    stretch[p.zone].push(c);
  });

  // ---------- diyas: collectibles first, then the lit rims of the islands ----------
  const L = course.lamps, nL = L.length, total = nL + rim.length;
  const bit: number[] = [], inZone = new Array(N).fill(0), lit = new Array(nL).fill(false), masks = new Array(N).fill(0);
  L.forEach((l, k) => { bit[k] = inZone[l.zone]++; });
  const bowls = new InstancedMesh(bowlGeometry, new MeshStandardMaterial({ color: '#9a6431', flatShading: true, roughness: 0.85, side: DoubleSide }), total);
  const flames = new InstancedMesh(flameGeometry, light('#ffd166'), total);
  const halos = glowPoints(total, 1.3), sparks = glowPoints(nL, 0.55);
  [bowls, flames, halos, sparks].forEach(o => { o.frustumCulled = false; scene.add(o); });
  const haloPos = halos.geometry.getAttribute('position').array as Float32Array;
  const sparkPos = sparks.geometry.getAttribute('position').array as Float32Array;
  const tmp = new Object3D();
  const place = (m: InstancedMesh, k: number, x: number, y: number, z: number, s: number) => {
    tmp.position.set(x, y, z); tmp.scale.setScalar(s); tmp.updateMatrix(); m.setMatrixAt(k, tmp.matrix);
  };
  const open = new Array(N).fill(true);
  const setLamp = (k: number) => {
    const l = L[k], show = open[l.zone], on = show && lit[k], s = 1.3;
    place(bowls, k, l.x, l.y, l.z, show ? s : 0);
    place(flames, k, l.x, l.y + 0.3 * s, l.z, on ? s : 0);
    haloPos.set(on ? [l.x, l.y + 0.45 * s, l.z] : [0, FAR, 0], k * 3);
    sparkPos.set(show && !lit[k] ? [l.x, l.y + 1.0, l.z] : [0, FAR, 0], k * 3);
  };
  const lampsDirty = () => {
    bowls.instanceMatrix.needsUpdate = true; flames.instanceMatrix.needsUpdate = true;
    halos.geometry.getAttribute('position').needsUpdate = true; sparks.geometry.getAttribute('position').needsUpdate = true;
  };
  rim.forEach((p, j) => {
    const k = nL + j;
    place(bowls, k, p[0], p[1], p[2], 1);
    place(flames, k, p[0], p[1] + 0.3, p[2], 1);
    haloPos.set([p[0], p[1] + 0.3, p[2]], k * 3);
  });

  // ---------- hero, Jyoti, shadow, beacon, particles ----------
  const H = hero();
  scene.add(H.root);
  const spirit = jyoti();
  spirit.scale.setScalar(0.42);
  scene.add(spirit);
  const shadow = new Mesh(new CircleGeometry(0.42, 18), new MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.35, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);
  const beam = beacon();
  const beamG = new Group();
  beamG.add(beam);
  scene.add(beamG);
  const works = particles(5, 36, 1.6), glints = particles(4, 14, 0.35);
  scene.add(works.pts, glints.pts);
  const GHOST: Material = new MeshBasicMaterial({ color: '#9b7bff', transparent: true, opacity: 0.12, depthWrite: false });

  // ---------- state ----------
  const pos = new Vector3(), vel = new Vector3(), camT = new Vector3(), tmpV = new Vector3();
  let heading = Math.PI, grounded = false, ground: Col | null = null, coyote = 0, buffer = 0;
  let zone = 0, lastHub = -1, lastY = 0, atCircle = -1, yaw = 0, pitch = 0.36, dist = 7, clock = 0;
  let safe = { x: 0, y: 0, z: 0 }, respawning = false, dropping = false, drop = 0, first = true, nextWork = 2, streak = 0, streakAt = 0, lockedAt = 0;
  let rise: { zone: number; t: number } | null = null, raf = 0, last = 0;
  const probe: number[] = [];
  let probing = false, probeAt = 0;

  const spawnAt = (i: number) => {
    const h = hubs[i];
    pos.set(h.x, h.y, h.z);
    vel.set(0, 0, 0);
    heading = Math.atan2(h.outX, h.outZ);
    yaw = Math.atan2(-h.outX, -h.outZ);
    camT.set(h.x, h.y + 1.3, h.z);
    safe = { x: h.x, y: h.y, z: h.z };
    lastY = h.y; zone = i; lastHub = -1; grounded = false; ground = null;
    updateHud();
  };

  const setOpen = (k: number, on: boolean) => {
    if (open[k] === on) return;
    open[k] = on;
    for (const c of stretch[k]) {
      c.on = on;
      c.node?.traverse(o => {
        const m = o as Mesh;
        if (!m.isMesh) return;
        if (!on) { if (!m.userData.m) m.userData.m = m.material; m.material = GHOST; } else if (m.userData.m) m.material = m.userData.m as Material;
      });
    }
    for (const c of cols[k]) if (c.gate === k) c.on = !on;
    const gt = gates[k - 1];
    if (gt) { gt.curtain.visible = !on; gt.lock.visible = !on; (gt.curtain.material as MeshBasicMaterial).opacity = 0.38; }
  };

  const hubOf = (c: Col | null) => (c && c.hub >= 0 ? c.hub : -1);
  const place2 = (i: number) => d!.places[i];
  const updateHud = () => {
    if (!d) return;
    const p = place2(zone);
    hPi.innerHTML = ic(info[zone].icon);
    hPi.style.background = info[zone].color;
    hPn.textContent = p.name;
    hPs.textContent = p.sub;
    if (p.subLang) hPs.lang = p.subLang; else hPs.removeAttribute('lang');
    hStars.innerHTML = p.locked ? ic('lock') : stars(p.stars);
    hTotal.innerHTML = `${ic('star')}${d.total}`;
    const got = L.reduce((a, l, k) => a + (l.zone === zone && lit[k] ? 1 : 0), 0);
    hLit.innerHTML = `${ic('diya')}${got}/${inZone[zone]}`;
    hLit.setAttribute('aria-label', `${d.labels.lit}: ${got}/${inZone[zone]}`);
  };
  const showBanner = (i: number) => {
    if (!d) return;
    const p = place2(i);
    (banner.firstElementChild as HTMLElement).textContent = p.name;
    const sm = banner.lastElementChild as HTMLElement;
    sm.textContent = p.sub;
    if (p.subLang) sm.lang = p.subLang; else sm.removeAttribute('lang');
    banner.classList.remove('on');
    void banner.offsetWidth;
    banner.classList.add('on');
  };
  const rotHint = () => {
    const portrait = innerHeight > innerWidth * 1.05, touch = matchMedia('(pointer: coarse)').matches;
    rot.hidden = !(active && touch && portrait && !rotDismissed);
  };
  const fit = () => {
    const w = innerWidth, h = innerHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < h ? 72 : 58;
    dist = w < h ? 8.2 : 7;
    camera.updateProjectionMatrix();
    rotHint();
    if (!active) renderer.render(scene, camera);
  };

  const respawn = () => {
    if (respawning) return;
    respawning = true;
    fade.classList.add('on');
    tone(520, 0.3, 'sine', 0.06, 0, 220);
    setTimeout(() => {
      pos.set(safe.x, safe.y, safe.z);
      vel.set(0, 0, 0);
      camT.set(pos.x, pos.y + 1.3, pos.z);
      grounded = false; ground = null; lastY = safe.y;
      fade.classList.remove('on');
      respawning = false;
    }, 260);
  };

  const collect = (k: number, t: number) => {
    lit[k] = true;
    const l = L[k];
    masks[l.zone] |= 1 << bit[k];
    setLamp(k);
    lampsDirty();
    streak = t - streakAt < 1.6 ? streak + 1 : 0;
    streakAt = t;
    sfx.bell(streak);
    buzz(10);
    glints.fire(l.x, l.y + 0.6, l.z, t, 2.4, 0.6, '#ffd166', -2);
    updateHud();
    d?.onLit(info[l.zone].id, masks[l.zone]);
  };

  // ---------- collision ----------
  const inside = (c: Col, x: number, z: number, m: number) => {
    const dx = x - c.x, dz = z - c.z;
    if (c.disc) return dx * dx + dz * dz < (c.r + m) * (c.r + m);
    const lx = dx * -c.uz + dz * c.ux, lz = dx * c.ux + dz * c.uz;
    return Math.abs(lx) < c.hw + m && Math.abs(lz) < c.hl + m;
  };
  /** Push a point out of a solid collider's side; returns the new x, z or null. */
  const pushOut = (c: Col, x: number, z: number): [number, number] | null => {
    const dx = x - c.x, dz = z - c.z;
    if (c.disc) {
      const dd = Math.hypot(dx, dz), m = c.r + RAD;
      if (dd >= m) return null;
      const nx = dd > 1e-4 ? dx / dd : -vel.x || 1, nz = dd > 1e-4 ? dz / dd : -vel.z;
      const nl = Math.hypot(nx, nz) || 1;
      return [c.x + (nx / nl) * m, c.z + (nz / nl) * m];
    }
    const vx = -c.uz, vz = c.ux;
    let lx = dx * vx + dz * vz, lz = dx * c.ux + dz * c.uz;
    const px = c.hw + RAD - Math.abs(lx), pz = c.hl + RAD - Math.abs(lz);
    if (px <= 0 || pz <= 0) return null;
    if (px < pz) lx = Math.sign(lx || 1) * (c.hw + RAD); else lz = Math.sign(lz || 1) * (c.hl + RAD);
    return [c.x + vx * lx + c.ux * lz, c.z + vz * lx + c.uz * lz];
  };

  // ---------- one simulation step ----------
  function step(dt: number, t: number) {
    const inp = ctl.input, z0 = Math.max(0, zone - 1), z1 = Math.min(N - 1, zone + 2);

    // Platforms that move or spin, and the bridge rising after a first win.
    if (rise) {
      rise.t += dt;
      const S = stretch[rise.zone], gt = gates[rise.zone - 1];
      S.forEach((c, j) => { c.lift = (1 - easeOut(clamp((rise!.t - j * 0.13) / 0.6, 0, 1))) * 7; });
      if (gt) {
        const k = clamp(rise.t / 0.9, 0, 1);
        (gt.curtain.material as MeshBasicMaterial).opacity = 0.38 * (1 - k);
        gt.curtain.visible = gt.lock.visible = k < 1;
      }
      if (rise.t > S.length * 0.13 + 0.7) { rise = null; sfx.win(); }
    }
    for (let k = z0; k <= z1; k++) {
      for (const c of cols[k]) {
        if (!c.node) continue;
        if (c.move) {
          const [ax, amp, per, ph] = c.move, o = Math.sin((t * Math.PI * 2) / per + ph) * amp;
          let nx = c.bx, ny = c.by, nz = c.bz;
          if (ax === 0) { nx += -c.uz * o; nz += c.ux * o; } else if (ax === 1) ny += o; else { nx += c.ux * o; nz += c.uz * o; }
          c.dx = nx - c.x; c.dy = ny - c.y; c.dz = nz - c.z;
          c.x = nx; c.y = ny; c.z = nz;
        }
        if (c.spin) c.node.rotation.y += c.spin * dt;
        c.node.position.set(c.x, c.y - c.lift, c.z);
      }
    }

    // Ride the platform underfoot.
    if (grounded && ground) {
      if (ground.move) { pos.x += ground.dx; pos.y += ground.dy; pos.z += ground.dz; }
      if (ground.spin) {
        const a = ground.spin * dt, ox = pos.x - ground.x, oz = pos.z - ground.z, ca = Math.cos(a), sa = Math.sin(a);
        pos.x = ground.x + ox * ca + oz * sa;
        pos.z = ground.z - ox * sa + oz * ca;
        heading += a;
      }
    }

    // Look around, then move relative to the camera.
    const live = enabled();
    if (live) {
      yaw -= inp.lookX * LOOK + inp.turn * 2.2 * dt;
      pitch = clamp(pitch + inp.lookY * LOOK * 0.7, 0.05, 1.15);
    }
    inp.lookX = inp.lookY = 0;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    let wx = live ? rx * inp.mx + fx * inp.my : 0, wz = live ? rz * inp.mx + fz * inp.my : 0;
    const wl = Math.hypot(wx, wz);
    if (wl > 1) { wx /= wl; wz /= wl; }
    const acc = (grounded ? 42 : 16) * dt;
    vel.x += clamp(wx * SPEED - vel.x, -acc, acc);
    vel.z += clamp(wz * SPEED - vel.z, -acc, acc);
    const speed = Math.hypot(vel.x, vel.z);
    if (speed > 0.3 && wl > 0.1) heading = turnTo(heading, Math.atan2(vel.x, vel.z), dt * 12);

    // Jump with coyote time and a jump buffer. Every jump is full height: quick taps on touch screens count.
    coyote = grounded ? COYOTE : coyote - dt;
    if (live && inp.jumps > 0) buffer = BUFFER; else buffer -= dt;
    inp.jumps = 0;
    if (buffer > 0 && coyote > 0) {
      vel.y = JUMP; buffer = 0; coyote = 0; grounded = false; ground = null;
      tone(330, 0.13, 'sine', 0.07, 0, 640);
      buzz(8);
    }
    vel.y = Math.max(vel.y - GRAV * dt, -FALL);

    // Move, slide along solid sides, then land on the highest surface crossed.
    const py = pos.y;
    let nx = pos.x + vel.x * dt, ny = pos.y + vel.y * dt, nz = pos.z + vel.z * dt;
    for (let k = z0; k <= z1; k++) {
      for (const c of cols[k]) {
        if (!c.on || !c.solid || ny >= c.y - STEP || ny + HEIGHT <= c.y - c.thick) continue;
        const r = pushOut(c, nx, nz);
        if (!r) continue;
        nx = r[0]; nz = r[1];
        if (c.gate >= 0 && t - lockedAt > 2.5) { lockedAt = t; d?.onLocked(); }
      }
    }
    let best = -1e9, bc: Col | null = null;
    const snap = grounded ? 0.08 : 0;
    for (let k = z0; k <= z1; k++) {
      for (const c of cols[k]) {
        if (!c.on || c.y <= best || py < c.y - STEP || ny > c.y + snap || !inside(c, nx, nz, RAD * 0.6)) continue;
        best = c.y; bc = c;
      }
    }
    if (bc && vel.y <= 0) {
      const impact = -vel.y;
      ny = bc.y;
      if (bc.pad) {
        vel.y = bc.pad; grounded = false; ground = null;
        H.land(0.5);
        tone(240, 0.24, 'sine', 0.1, 0, 900);
        buzz(15);
      } else {
        if (!grounded && impact > 7) { H.land(Math.min(1, impact / 18)); tone(140, 0.1, 'sine', 0.1, 0, 70); }
        vel.y = 0; grounded = true; ground = bc;
      }
    } else { grounded = false; ground = null; }
    pos.set(nx, ny, nz);

    // Places, checkpoints and falls.
    if (grounded && ground) {
      lastY = ground.y;
      if (ground.zone !== zone) { zone = ground.zone; updateHud(); }
      const hb = hubOf(ground);
      if (hb >= 0) {
        safe = { x: hubs[hb].x, y: hubs[hb].y, z: hubs[hb].z };
        if (hb !== lastHub) { lastHub = hb; showBanner(hb); }
      } else if (ground.cp && !ground.cp.halo.visible) {
        ground.cp.halo.visible = true;
        (ground.cp.lamp as Mesh).material = light('#ffd166');
        safe = { x: ground.x, y: ground.y, z: ground.z };
        sfx.good();
      } else if (ground.cp) safe = { x: ground.x, y: ground.y, z: ground.z };
    }
    if (pos.y < lastY - 14) respawn();

    // Story circle: the action button appears inside it.
    let here = -1;
    const hb = hubOf(ground);
    if (grounded && hb >= 0 && Math.hypot(pos.x - hubs[hb].x, pos.z - hubs[hb].z) < 1.7) here = hb;
    if (here !== atCircle) {
      atCircle = here;
      if (here >= 0 && d) {
        ctl.setAction(`${ic(info[here].icon)}<b>${d.labels.play}</b>`, `${d.labels.play} · ${place2(here).name}`);
        tone(660, 0.2, 'triangle', 0.05);
      } else ctl.clearAction();
    }
    if (inp.acts > 0) {
      inp.acts = 0;
      if (live && atCircle >= 0 && d) d.onOpen(atCircle);
    }

    // Diyas light when touched.
    for (let k = 0; k < nL; k++) {
      if (lit[k] || !open[L[k].zone]) continue;
      const l = L[k], dx = l.x - pos.x, dz = l.z - pos.z;
      if (dx * dx + dz * dz < 0.81 && pos.y < l.y + 0.9 && pos.y + HEIGHT > l.y) collect(k, t);
    }
  }

  // ---------- drawing ----------
  function draw(dt: number, t: number) {
    const speed = Math.hypot(vel.x, vel.z), inp = ctl.input;
    if (dropping) {
      drop += dt;
      const k = clamp(drop / 1.9, 0, 1);
      pos.y = safe.y + 13 * (1 - easeOut(k));
      if (k >= 1) { dropping = false; pos.y = safe.y; H.land(0.8); tone(160, 0.14, 'sine', 0.12, 0, 80); }
    }
    H.root.position.copy(pos);
    H.root.rotation.y = heading;
    H.animate(dt, speed / SPEED, dropping || !grounded, dropping ? -3 : vel.y);

    // Camera eases behind the direction of travel unless the player is looking around.
    if (speed > 1 && performance.now() - inp.lookAt > 1200 && !dropping) {
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw), fwd = (vel.x * fx + vel.z * fz) / speed;
      if (fwd > -0.2) yaw = turnTo(yaw, Math.atan2(-vel.x, -vel.z), dt * 1.3 * (fwd + 0.3));
    }
    const kx = Math.min(1, dt * 12), ky = Math.min(1, dt * (d?.reduced ? 20 : 6));
    camT.x += (pos.x - camT.x) * kx;
    camT.z += (pos.z - camT.z) * kx;
    camT.y += (pos.y + 1.3 - camT.y) * ky;
    const cp = Math.cos(pitch), cd = dropping ? dist * 1.25 : dist;
    camera.position.set(camT.x + Math.sin(yaw) * cp * cd, camT.y + Math.sin(pitch) * cd, camT.z + Math.cos(yaw) * cp * cd);
    camera.lookAt(camT.x, camT.y + 0.2, camT.z);
    sky.position.copy(camera.position);
    sea.position.x = pos.x; sea.position.z = pos.z;

    // Jyoti floats at the hero's shoulder; during the descent she carries them down.
    const hs = Math.sin(heading), hc = Math.cos(heading), bob = d?.reduced ? 0 : Math.sin(t * 2.4) * 0.12;
    const ox = dropping ? 0 : 0.62, oy = dropping ? 2.2 : 1.85, oz = dropping ? 0 : -0.3;
    const tx = pos.x + ox * hc + oz * hs, ty = pos.y + oy + bob, tz = pos.z - ox * hs + oz * hc;
    const kj = Math.min(1, dt * (dropping ? 20 : 6));
    spirit.position.x += (tx - spirit.position.x) * kj;
    spirit.position.y += (ty - spirit.position.y) * kj;
    spirit.position.z += (tz - spirit.position.z) * kj;
    spirit.rotation.y = heading;
    spirit.scale.setScalar(dropping ? 0.6 : 0.42);

    // Blob shadow on the surface below.
    let gy = -1e9;
    for (let k = Math.max(0, zone - 1); k <= Math.min(N - 1, zone + 1); k++) {
      for (const c of cols[k]) if (c.on && c.y <= pos.y + 0.05 && c.y > gy && inside(c, pos.x, pos.z, 0)) gy = c.y;
    }
    shadow.visible = gy > -1e8;
    if (shadow.visible) {
      const s = 1 / (1 + (pos.y - gy) * 0.3);
      shadow.position.set(pos.x, gy + 0.03, pos.z);
      shadow.scale.setScalar(s);
      (shadow.material as MeshBasicMaterial).opacity = 0.35 * s;
    }

    // Nearby places only; story circles breathe, the next place's beam glows.
    for (let k = 0; k < N; k++) zones[k].visible = k >= zone - 1 && k <= zone + 2;
    const cur = d ? d.cur : 0;
    circles.forEach((c, i) => {
      if (!zones[i].visible) return;
      c.icon.position.y = 2.5 + (d?.reduced ? 0 : Math.sin(t * 2 + i) * 0.14);
      const pulse = i === cur && !d?.reduced ? 1 + Math.sin(t * 4) * 0.05 : 1;
      c.ring.scale.set(pulse, pulse, pulse);
      // Badges name places from afar; on the island itself the HUD does that.
      const h = hubs[i], hd = Math.hypot(pos.x - h.x, pos.z - h.z), cd = camera.position.distanceTo(c.icon.getWorldPosition(tmpV));
      (c.icon.material as SpriteMaterial).opacity = Math.min(clamp((hd - h.r) / 4, 0, 1), clamp((cd - 5) / 5, 0, 1));
    });
    const bd = Math.hypot(pos.x - beamG.position.x, pos.z - beamG.position.z);
    beam.visible = bd > 7;
    (beam.material as MeshBasicMaterial).opacity = clamp((bd - 7) / 10, 0, 1);
    (sparks.material as PointsMaterial).size = 0.5 + (d?.reduced ? 0 : Math.sin(t * 5) * 0.12);

    // Fireworks over the journey (none with reduced motion).
    if (!d?.reduced && t > nextWork) {
      nextWork = t + 0.9 + Math.random() * 1.8;
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw), side = (Math.random() - 0.5) * 50;
      works.fire(pos.x + fx * 38 + fz * side, pos.y + 16 + Math.random() * 10, pos.z + fz * 38 - fx * side, t, 5 + Math.random() * 2, 1.7,
        ['#ffd166', '#ff6fa8', '#4dabf7', '#3fb36b', '#ff8a1f', '#b9a6ff'][Math.floor(Math.random() * 6)]);
    }
    works.update(t);
    glints.update(t);
    renderer.render(scene, camera);
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const ms = now - last;
    last = now;
    if (!active || !d) return;
    if (lostAt) {
      if (now - lostAt > 5000) { lostAt = 0; d.onLost(); }
      return;
    }
    if (d.busy()) return;
    const dt = Math.min(0.05, ms / 1000);
    clock += dt;
    if (!dropping && !respawning) step(dt, clock);
    draw(dt, clock);
    if (probing && now > probeAt) {
      probe.push(ms);
      if (probe.length >= 45) {
        probing = false;
        const med = probe.slice().sort((a, b) => a - b)[22];
        if (med > 34) {
          if (q < DPRS.length - 1) { q++; renderer.setPixelRatio(DPRS[q]); fit(); startProbe(); } else d.onSlow();
        }
      }
    }
  }
  const startProbe = () => {
    if (!d || d.force) return;
    probe.length = 0; probing = true; probeAt = performance.now() + 1500;
  };
  const askLandscape = () => {
    if (!matchMedia('(pointer: coarse)').matches) return;
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    const lock = () => { try { o?.lock?.('landscape').catch(() => {}); } catch { /* not supported */ } };
    const de = document.documentElement;
    if (!document.fullscreenElement && de.requestFullscreen) de.requestFullscreen({ navigationUI: 'hide' }).then(lock, () => {});
    else lock();
  };
  const onVisible = () => {
    if (document.hidden) return;
    last = performance.now();
    if (lostAt) lostAt = last; // the wait for the GPU counts only while the page is visible
  };
  // Phones take the GPU away under memory pressure, often while the game is in the background.
  // That says nothing about speed: pause, and let three.js rebuild everything when it comes back.
  let lostAt = 0;
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); lostAt = performance.now() || 1; probing = false; });
  cv.addEventListener('webglcontextrestored', () => { lostAt = 0; last = performance.now(); });

  return {
    show(nd) {
      d = nd;
      ctl.el.querySelector('.w3-jump')!.setAttribute('aria-label', nd.labels.jump);
      (['map', 'album', 'settings', 'home'] as const).forEach(a => hud.querySelector(`[data-a="${a}"]`)!.setAttribute('aria-label', nd.labels[a]));
      (rot.querySelector('p') as HTMLElement).textContent = nd.labels.rotate;
      (rot.querySelector('button') as HTMLElement).textContent = nd.labels.close;
      for (let k = 1; k < N; k++) setOpen(k, !nd.places[k].locked);
      for (let z = 0; z < N; z++) masks[z] = nd.lit[info[z].id] || 0;
      for (let k = 0; k < nL; k++) { lit[k] = !!(masks[L[k].zone] & (1 << bit[k])); setLamp(k); }
      lampsDirty();
      const target: Hub = hubs[clamp(nd.cur, 0, N - 1)];
      beamG.position.set(target.x, target.y, target.z);
      root.hidden = false;
      root.classList.remove('bg');
      document.documentElement.classList.add('w3on');
      if (first) {
        first = false;
        spawnAt(nd.justUnlocked > 0 ? nd.justUnlocked - 1 : clamp(nd.cur, 0, N - 1));
        if (!nd.reduced) { dropping = true; drop = 0; pos.y = safe.y + 13; }
        askLandscape();
        startProbe();
      }
      if (nd.justUnlocked > 0) {
        const from = nd.justUnlocked - 1;
        if (zone !== from || hubOf(ground) !== from) spawnAt(from);
        rise = { zone: nd.justUnlocked, t: 0 };
        for (const c of stretch[nd.justUnlocked]) c.lift = 7;
        tone(300, 0.5, 'sine', 0.06, 0, 900);
      }
      if (!active) {
        active = true;
        ctl.attach();
        addEventListener('resize', fit);
        document.addEventListener('visibilitychange', onVisible);
        fit();
        last = performance.now();
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(frame);
      }
      updateHud();
      rotHint();
    },
    hide() {
      if (!active) return;
      active = false;
      cancelAnimationFrame(raf);
      ctl.detach();
      ctl.clearAction();
      atCircle = -1;
      removeEventListener('resize', fit);
      document.removeEventListener('visibilitychange', onVisible);
      root.classList.add('bg');
      rot.hidden = true;
      document.documentElement.classList.remove('w3on');
    },
    off() {
      this.hide();
      root.hidden = true;
    },
    travel(i) {
      if (!open[i] && i > 0) return;
      spawnAt(i);
      dropping = false;
      showBanner(i);
      sfx.whoosh();
    },
    state() {
      let next: number[] | null = null, nd = Infinity;
      L.forEach((l, k) => {
        const dd = Math.hypot(l.x - pos.x, l.z - pos.z);
        if (!lit[k] && open[l.zone] && dd < nd) { nd = dd; next = [l.x, l.y, l.z]; }
      });
      return { x: pos.x, y: pos.y, z: pos.z, zone, grounded, circle: atCircle, lit: lit.filter(Boolean).length, open: open.slice(), next };
    },
    put(x, y, z) {
      pos.set(x, y, z); vel.set(0, 0, 0); grounded = false; ground = null; dropping = false;
      camT.set(x, y + 1.3, z);
    },
  };
}
