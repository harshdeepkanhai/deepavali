// Kala Pani as a three-lane 3D runner. Same rules, timing and scoring as E.runner (2D):
// dodge storms and whirlpools, collect diyas, reach the shore with your lives.
import {
  Color, DirectionalLight, Fog, HemisphereLight, Mesh, MeshBasicMaterial, Object3D, PerspectiveCamera,
  PlaneGeometry, Scene, Shape, ShapeGeometry, TorusGeometry, Vector3, WebGLRenderer,
} from 'three';
import { G, HUD, pop, flash, shakeEl, burstAt } from '../core/clock.js';
import { field, keys } from '../game/engines.js';
import { t } from '../core/i18n.js';
import { sfx, buzz } from '../core/audio.js';
import { any, clamp, ri } from '../core/util.js';
import { ic } from '../core/icons.js';
import { at, ball, cone, diya, disposeTree, glow, group, light, mat, palm, ship, starfield } from './kit';

type Obj = { lane: number; kind: 'storm' | 'whirl' | 'lamp'; node: Object3D; z: number; hit: boolean };

// The game clock is plain JS; give its two hook slots their real types.
const hooks = G as unknown as { onResize: (() => void) | null; cleanup: (() => void) | null };

const LANE = 1.6;
const SPAWN_Z = -55;

export function runner3d(st: HTMLElement, c: { time: number }, done: (r: { stars: number; line: string }) => void) {
  const F = field(st) as HTMLElement;
  const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  const cv = renderer.domElement;
  cv.className = 'cv';
  F.appendChild(cv);

  const scene = new Scene();
  scene.background = new Color('#061626');
  scene.fog = new Fog('#0a2a44', 16, 52);
  const camera = new PerspectiveCamera(62, 1, 0.1, 90);
  camera.position.set(0, 3.3, 6.8);
  camera.lookAt(0, 0.7, -7);
  scene.add(new HemisphereLight('#9cc8ff', '#0b2238', 2.2));
  const sun = new DirectionalLight('#ffe2b0', 1.6);
  sun.position.set(-3, 8, 4);
  scene.add(sun, starfield(260, 70, 24, -40, 6));

  // Ocean: a low-poly sheet whose vertices roll as the ship moves.
  const sea = new Mesh(new PlaneGeometry(34, 96, 22, 60), mat('#0e5a7a'));
  sea.rotation.x = -Math.PI / 2;
  sea.position.z = -30;
  scene.add(sea);
  const seaPos = sea.geometry.getAttribute('position');

  // Lantern buoys on both sides give a sense of speed.
  const buoys: Object3D[] = [];
  for (let i = 0; i < 12; i++) {
    const b = group(ball(0.12, '#ffc24b', 0, 0.25, 0, 0), at(glow(0.9, 0.7), 0, 0.3, 0));
    b.position.set(i % 2 ? 2.9 : -2.9, 0, -i * 8);
    buoys.push(b);
    scene.add(b);
  }

  const boat = ship();
  boat.scale.setScalar(0.85);
  scene.add(boat);

  // Templates, cloned per spawn (clones share geometry and materials).
  const boltShape = new Shape();
  boltShape.moveTo(0.1, 0.9); boltShape.lineTo(-0.25, 0.05); boltShape.lineTo(0.02, 0.05);
  boltShape.lineTo(-0.12, -0.8); boltShape.lineTo(0.3, 0.15); boltShape.lineTo(0.02, 0.15); boltShape.lineTo(0.1, 0.9);
  const shadow = new Mesh(new PlaneGeometry(1.6, 1.6), new MeshBasicMaterial({ color: '#02101c', transparent: true, opacity: 0.45, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.05;
  const storm = group(ball(0.55, '#5f6683', -0.4, 2.3, 0, 1), ball(0.7, '#6b7390', 0.15, 2.45, -0.1, 1), ball(0.5, '#5f6683', 0.6, 2.25, 0.1, 1),
    at(new Mesh(new ShapeGeometry(boltShape), light('#ffe066')), 0, 1.15, 0.1), shadow);
  const whirl = group(new Mesh(new TorusGeometry(0.85, 0.11, 6, 22), mat('#4dabf7')), new Mesh(new TorusGeometry(0.5, 0.09, 6, 18), mat('#d0ebff')),
    new Mesh(new TorusGeometry(0.2, 0.07, 6, 12), mat('#1971c2')));
  whirl.children.forEach(m => { m.rotation.x = -Math.PI / 2; m.position.y = 0.08; });
  const lamp = diya(true);
  lamp.scale.setScalar(1.5);
  const shore = group(cone(3.2, 0.9, 9, '#e8c27a', 0, 0.3, 0), palm(-0.6, 0, 1.6), palm(0.8, 0.4, 1.3), at(glow(4, 0.5), 0, 1, 0));
  shore.visible = false;
  scene.add(shore);

  const T = c.time * 1000, t0 = G.now(), objs: Obj[] = [], TH = [0.3, 0.6, 0.9], MS = ['rn1', 'rn2', 'rn3'];
  let lane = 1, lives = 3, inv = 0, lamps = 0, next = t0 + 700, last = t0, over = false, won = 0, ms = 0, dist = 0, gx = 0, moved = false;
  let boatX = 0;
  HUD.lives(3);
  const sc = () => HUD.score(`${ic('diya')}${lamps}`);
  sc();

  const fit = () => {
    const w = F.clientWidth, h = F.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  fit();
  hooks.onResize = fit;

  const v = new Vector3();
  const screenAt = (p: Vector3): [number, number] => {
    v.copy(p).project(camera);
    return [((v.x + 1) / 2) * F.clientWidth, ((1 - v.y) / 2) * F.clientHeight + F.offsetTop];
  };

  const move = (d: number) => {
    if (over || G.paused) return;
    const nl = clamp(lane + d, 0, 2);
    if (nl !== lane) { lane = nl; sfx.whoosh(); buzz(8); }
  };
  cv.addEventListener('pointerdown', e => { gx = e.clientX; moved = false; try { cv.setPointerCapture(e.pointerId); } catch { /* ignore */ } });
  cv.addEventListener('pointermove', e => {
    if (!e.buttons && e.pointerType === 'mouse') return;
    const d = e.clientX - gx;
    if (Math.abs(d) > 30) { move(Math.sign(d)); gx = e.clientX; moved = true; }
  });
  cv.addEventListener('pointerup', e => {
    if (moved) return;
    const r = cv.getBoundingClientRect();
    move(e.clientX - r.left < r.width / 2 ? -1 : 1);
  });
  keys((e: KeyboardEvent) => { if (e.key === 'ArrowLeft') move(-1); if (e.key === 'ArrowRight') move(1); });
  const keyCleanup = hooks.cleanup;
  hooks.cleanup = () => {
    if (keyCleanup) keyCleanup();
    disposeTree(scene);
    renderer.dispose();
    renderer.forceContextLoss();
  };

  function spawn(kind: Obj['kind'], ln: number) {
    const node = (kind === 'storm' ? storm : kind === 'whirl' ? whirl : lamp).clone();
    node.position.set((ln - 1) * LANE, 0, SPAWN_Z);
    scene.add(node);
    objs.push({ lane: ln, kind, node, z: SPAWN_Z, hit: false });
  }
  function row() {
    const obs = [ri(0, 2)];
    if (Math.random() < 0.3) obs.push((obs[0] + ri(1, 2)) % 3);
    obs.forEach(l => spawn(Math.random() < 0.5 ? 'storm' : 'whirl', l));
    const free = [0, 1, 2].filter(l => !obs.includes(l));
    if (Math.random() < 0.65) spawn('lamp', any(free));
  }

  G.loop((now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const W = F.clientWidth, H = F.clientHeight, el = now - t0, p = clamp(el / T, 0, 1), sp = 22 + p * 18;
    dist += sp * dt;
    if (!over) {
      HUD.time(1 - p);
      if (ms < 3 && p >= TH[ms]) { pop(t(MS[ms]), W / 2, F.offsetTop + H * 0.32, 'good big'); ms++; }
      if (el >= T) {
        over = true; won = now; sfx.win();
        shore.visible = true; shore.position.set(0, 0, -44);
        G.later(() => done({ stars: lives, line: t('rnW', { l: lamps }) }), 1400);
      } else if (now >= next) { row(); next = now + Math.max(430, 820 - p * 390); }
    }

    const target = (lane - 1) * LANE;
    boatX += (target - boatX) * Math.min(1, dt * 12);
    boat.position.set(boatX, Math.sin(now / 300) * 0.06, 0);
    boat.rotation.set(Math.sin(now / 420) * 0.04, 0, (boatX - target) * 0.3);
    boat.visible = !(now < inv && Math.floor(now / 100) % 2);

    for (const o of objs) {
      const z0 = o.z;
      o.z += sp * dt;
      o.node.position.z = o.z;
      if (o.kind === 'whirl') o.node.rotation.y += dt * 4;
      if (o.kind === 'lamp') o.node.position.y = 0.2 + Math.sin(now / 250 + o.lane) * 0.1;
      // Swept check: did it cross the ship this frame? (fast objects cannot skip through)
      if (over || o.hit || o.lane !== lane || z0 > 0.6 || o.z < -0.6) continue;
      if (o.kind === 'lamp') {
        o.hit = true; o.node.visible = false; lamps++; sc(); sfx.good(); buzz(10);
        const [x, y] = screenAt(o.node.position);
        burstAt(x, y, 10);
        continue;
      }
      if (now < inv) continue;
      o.hit = true; lives--; inv = now + 1200;
      HUD.lives(lives); sfx.bad(); buzz(150); flash('#3aa0ff'); shakeEl(F);
      if (lives <= 0) { over = true; G.later(() => done({ stars: 0, line: t('rnL') }), 800); }
    }
    for (let i = objs.length - 1; i >= 0; i--) if (objs[i].z > 9) { scene.remove(objs[i].node); objs.splice(i, 1); }

    for (const b of buoys) { b.position.z += sp * dt; if (b.position.z > 8) b.position.z -= 96; }
    if (won) shore.position.z = Math.min(-9, -44 + ((now - won) / 1000) * 24);

    const arr = seaPos.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      const x = arr[i], y = arr[i + 1];
      arr[i + 2] = Math.sin(x * 0.7 + (y + dist) * 0.32) * 0.16 + Math.cos(y * 0.45 + dist * 0.2) * 0.1;
    }
    seaPos.needsUpdate = true;

    renderer.render(scene, camera);
  });
}
