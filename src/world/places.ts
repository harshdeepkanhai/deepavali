// The pieces of each place in the 3D journey: islands, landmarks, story circles, gates of light
// and the themed platforms between places. Built from primitives in the icon set's colours.
import {
  AdditiveBlending, CanvasTexture, CircleGeometry, Color, CylinderGeometry, DoubleSide, Group, IcosahedronGeometry,
  InstancedMesh, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, SRGBColorSpace, Sprite, SpriteMaterial, TorusGeometry,
} from 'three';
import { sprite } from '../core/icons.js';
import { at, ball, box, cone, cyl, glow, group, lampArch, light, mat, palm, ship } from './kit';
import type { Plat } from './course';

export const mix = (a: string, b: string, k: number) => '#' + new Color(a).lerp(new Color(b), k).getHexString();

/** One landmark per place (about 1.5 units tall; scaled up on the islands). */
export function landmark(id: string): Group {
  const water = (c = '#2f7fc4') => cyl(1.12, 1.12, 0.05, c, 0, 0.03, 0, 10);
  switch (id) {
    case 'ayodhya': return group(box(1.1, 0.42, 0.9, '#c56a2a', 0, 0.21), cone(0.55, 1.05, 4, '#ef8f3a', 0, 0.94), ball(0.11, '#ffd166', 0, 1.52, 0, 0, 0.6), palm(0.85, 0.35, 0.9));
    case 'braj': return group(cone(0.95, 1.25, 7, '#3fa35b', -0.1, 0.62), cone(0.55, 0.75, 6, '#2f7d45', 0.62, 0.37, 0.25), ball(0.12, '#f4efe6', -0.7, 0.12, 0.55));
    case 'pawapuri': return group(water('#3a7bd5'), box(0.75, 0.32, 0.75, '#f6f1e7', 0, 0.2), ball(0.3, '#ffffff', 0, 0.55), cone(0.06, 0.25, 6, '#ffd166', 0, 0.92));
    case 'amritsar': return group(water(), box(0.9, 0.42, 0.9, '#e8b923', 0, 0.26, 0, 0.6), ball(0.36, '#ffd34d', 0, 0.68, 0, 1, 0.6), cyl(0.03, 0.04, 0.3, '#ffd34d', 0, 1.15, 0, 6, 0.6), glow(2.2, 0.5));
    case 'kolkata': {
      const plumes = [-0.3, 0, 0.3].map(x => cone(0.08, 0.5, 5, '#f4efe6', x, 1.05, 0));
      return group(cyl(0.48, 0.48, 0.8, '#c92a2a', 0, 0.4, 0, 10), cyl(0.5, 0.5, 0.05, '#f4efe6', 0, 0.82, 0, 10), cyl(0.5, 0.5, 0.06, '#ffc24b', 0, 0.2, 0, 10), ...plumes);
    }
    case 'goa': return group(palm(-0.55, 0.1, 1.2), palm(0.6, -0.2, 1.0), cone(0.22, 0.85, 5, '#3b2f5a', 0, 0.42, 0.35), ball(0.14, '#ff8a1f', 0, 0.12, 0.6, 0));
    case 'gujarat': return group(cyl(0.7, 0.7, 0.03, '#e8355a', 0.15, 0.02, 0.35, 8), cyl(0.48, 0.48, 0.035, '#ffcf3a', 0.15, 0.03, 0.35, 8), cyl(0.24, 0.24, 0.04, '#22b8a0', 0.15, 0.04, 0.35, 8),
      box(0.6, 0.5, 0.5, '#f2c14e', -0.35, 0.25, -0.3), cone(0.48, 0.4, 4, '#c2255c', -0.35, 0.7, -0.3));
    case 'nepal': return group(cone(0.75, 1.5, 5, '#e9ecf5', 0, 0.75), cone(0.5, 1.0, 5, '#cfd6ea', -0.62, 0.5, 0.15), cone(0.48, 0.9, 5, '#cfd6ea', 0.6, 0.45, -0.1), cone(0.22, 0.32, 5, '#ffffff', 0, 1.35));
    case 'kalapani': { const s = at(ship(), 0, 0.03, 0); s.scale.setScalar(0.7); s.rotation.y = -0.6; return group(water('#1c6ea4'), s); }
    case 'trinidad': return group(lampArch(0.75, '#3fb36b', '#ffd166', 9), cyl(0.04, 0.04, 0.5, '#3fb36b', -0.75, 0.25), cyl(0.04, 0.04, 0.5, '#3fb36b', 0.75, 0.25));
    case 'malaysia': {
      const lantern = group(ball(0.24, '#e8355a', 0, 0, 0, 1), cyl(0.12, 0.12, 0.06, '#ffc24b', 0, 0.24), cyl(0.12, 0.12, 0.06, '#ffc24b', 0, -0.24), glow(1.2, 0.6));
      return group(box(0.32, 1.35, 0.32, '#7b6cf6', -0.4, 0.68), box(0.3, 0.95, 0.3, '#9b8cff', 0.05, 0.48, -0.25), at(lantern, 0.55, 0.85, 0.2), cyl(0.01, 0.01, 0.4, '#ffc24b', 0.55, 1.2, 0.2, 4));
    }
    case 'leicester': return group(box(1.7, 0.06, 0.45, '#555a6e', 0, 0.03), lampArch(0.7, '#a7adbf', '#fff3b0', 11), lampArch(0.5, '#a7adbf', '#ffd166', 7));
    case 'world': return group(ball(0.75, '#2f6fd1', 0, 0.95, 0, 2), ball(0.3, '#3fb36b', 0.35, 1.2, 0.5, 1), ball(0.26, '#3fb36b', -0.45, 0.8, 0.45, 1), ball(0.2, '#3fb36b', 0.1, 0.55, 0.65, 1), glow(3.2, 0.6));
    default: return group();
  }
}

/** Solid footprint of each landmark at scale 1: radius and height. */
export const FOOT: Record<string, [number, number]> = {
  ayodhya: [0.6, 1.6], braj: [0.75, 1.3], pawapuri: [0.45, 1.0], amritsar: [0.55, 1.2], kolkata: [0.55, 1.3],
  goa: [0.5, 1.2], gujarat: [0.5, 0.9], nepal: [0.8, 1.5], kalapani: [0.55, 1.4], trinidad: [0.85, 0.9],
  malaysia: [0.55, 1.4], leicester: [0.8, 0.8], world: [0.8, 1.7],
};

/** A floating island: walkable top at y = 0, rock hanging below. */
export function island(r: number, color: string): Group {
  const top = cyl(r, r * 0.96, 0.8, mix('#e6d3b3', color, 0.22), 0, -0.4, 0, 16);
  const edge = cyl(r * 0.96, r * 0.9, 0.5, mix('#8a6a4a', color, 0.15), 0, -1.05, 0, 16);
  const under = cone(r * 0.9, r * 0.95, 9, '#3a2a55', 0, -1.3 - r * 0.47, 0);
  under.rotation.x = Math.PI;
  return group(top, edge, under);
}

const iconTex = new Map<string, CanvasTexture>();
/** A round badge texture with an icon from the icon set. */
export function iconTexture(name: string, bg: string): CanvasTexture {
  const key = name + bg;
  let t = iconTex.get(key);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!;
  x.fillStyle = bg;
  x.beginPath();
  x.arc(64, 64, 58, 0, Math.PI * 2);
  x.fill();
  x.lineWidth = 6;
  x.strokeStyle = '#fff4e0';
  x.stroke();
  x.drawImage(sprite(name, 76), 26, 26, 76, 76);
  t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  iconTex.set(key, t);
  return t;
}

export function badge(name: string, bg: string, size: number): Sprite {
  const s = new Sprite(new SpriteMaterial({ map: iconTexture(name, bg), transparent: true }));
  s.scale.set(size, size, 1);
  return s;
}

/** The glowing circle where a place's story opens, with the place's icon floating above. */
export function storyCircle(color: string, icon: string) {
  const ring = new Mesh(new TorusGeometry(1.5, 0.08, 6, 36), light(color));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  const disc = new Mesh(new CircleGeometry(1.45, 36), new MeshBasicMaterial({ color, transparent: true, opacity: 0.22, blending: AdditiveBlending, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.04;
  const icon3 = at(badge(icon, color, 1.3), 0, 2.5, 0);
  return { root: group(ring, disc, icon3), ring, disc, icon: icon3 };
}

let beamTex: CanvasTexture | null = null;
/** A tall beam of light that marks the next place to play from far away. */
export function beacon(): Mesh {
  if (!beamTex) {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 128;
    const x = c.getContext('2d')!, g = x.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, 'rgba(255,214,120,0)');
    g.addColorStop(0.75, 'rgba(255,200,100,0.3)');
    g.addColorStop(1, 'rgba(255,236,170,0.75)');
    x.fillStyle = g;
    x.fillRect(0, 0, 4, 128);
    beamTex = new CanvasTexture(c);
  }
  const m = new Mesh(new CylinderGeometry(1.6, 1.6, 34, 18, 1, true),
    new MeshBasicMaterial({ map: beamTex, transparent: true, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }));
  m.position.y = 17;
  return m;
}

/** Many small balls in one draw call (garlands, flowers). */
function beads(points: number[][], colors: string[], r: number): InstancedMesh {
  const m = new InstancedMesh(new IcosahedronGeometry(r, 0), mat('#ffffff'), points.length);
  const o = new Object3D(), c = new Color();
  points.forEach((p, k) => {
    o.position.set(p[0], p[1], p[2]);
    o.updateMatrix();
    m.setMatrixAt(k, o.matrix);
    m.setColorAt(k, c.set(colors[k % colors.length]));
  });
  return m;
}

const curtainMat = () => new MeshBasicMaterial({ color: '#9b7bff', transparent: true, opacity: 0.38, blending: AdditiveBlending, depthWrite: false, side: DoubleSide });

/** A torana with a marigold garland. While the next place is locked, a curtain of light closes it. */
export function gate() {
  const garland: number[][] = [];
  for (let k = 0; k <= 12; k++) {
    const t = k / 12;
    garland.push([-1.8 + 3.6 * t, 2.95 - Math.sin(t * Math.PI) * 0.4, 0.22]);
  }
  const root = group(
    box(0.45, 3.3, 0.45, '#d9b77a', -2.0, 1.65, 0), box(0.45, 3.3, 0.45, '#d9b77a', 2.0, 1.65, 0),
    box(5.0, 0.42, 0.62, '#c56a2a', 0, 3.4, 0), box(4.2, 0.18, 0.5, '#ffc24b', 0, 3.7, 0, 0.5),
    ball(0.17, '#ffd166', -2.0, 3.75, 0, 0, 0.6), ball(0.17, '#ffd166', 2.0, 3.75, 0, 0, 0.6),
    beads(garland, ['#ff8a1f', '#ffc24b'], 0.11),
  );
  const curtain = new Mesh(new PlaneGeometry(3.55, 3.1), curtainMat());
  curtain.position.y = 1.55;
  const lock = at(badge('lock', '#3b2a5c', 0.95), 0, 1.6, 0.06);
  root.add(curtain, lock);
  return { root, curtain, lock };
}

/** A few props that say where you are. */
export function props(id: string, r: number): Group {
  const g = group(), ring = (n: number, rad: number, fn: (x: number, z: number, k: number) => Object3D) => {
    for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + 0.3; g.add(fn(Math.cos(a) * rad, Math.sin(a) * rad, k)); }
  };
  switch (id) {
    case 'ayodhya': case 'goa': case 'kalapani': case 'trinidad':
      g.add(palm(-r * 0.62, -r * 0.45, 1.9), palm(r * 0.58, -r * 0.5, 1.6)); break;
    case 'braj': ring(4, r * 0.72, (x, z) => group(cyl(0.08, 0.1, 0.6, '#6b4a2b', x, 0.3, z, 6), cone(0.55, 1.2, 6, '#3fa35b', x, 1.1, z))); break;
    case 'gujarat': case 'malaysia':
      g.add(cyl(1.0, 1.0, 0.03, id === 'gujarat' ? '#e8355a' : '#f4efe6', r * 0.5, 0.02, r * 0.35, 10),
        cyl(0.65, 0.65, 0.035, id === 'gujarat' ? '#ffcf3a' : '#ff8a1f', r * 0.5, 0.03, r * 0.35, 10),
        cyl(0.3, 0.3, 0.04, id === 'gujarat' ? '#22b8a0' : '#e8355a', r * 0.5, 0.04, r * 0.35, 10)); break;
    case 'leicester': ring(4, r * 0.8, (x, z) => group(cyl(0.05, 0.06, 2.2, '#3b3450', x, 1.1, z, 6), ball(0.16, '#fff3b0', x, 2.3, z, 0), at(glow(1.4, 0.6), x, 2.3, z))); break;
    default: break;
  }
  return g;
}

const STYLE: Record<string, string> = {
  stone: '#cdbb9b', grass: '#56b870', lotus: '#3fb36b', wood: '#a8743d', drum: '#c92a2a', rangoli: '#f2c14e',
  snow: '#e9ecf5', rock: '#8a7aa0', crate: '#b07a3c', bamboo: '#9ccc65', roof: '#d9534f', glow: '#b9a6ff',
};

/** The mesh for one platform, built at the origin (top surface at y = 0). */
export function platformMesh(p: Plat): Group {
  const c = STYLE[p.style] || '#cdbb9b', g = group();
  if (p.disc) {
    const r = p.len / 2;
    const body = p.style === 'glow' ? at(new Mesh(new CylinderGeometry(r, r * 0.85, p.thick, 14), light(c)), 0, -p.thick / 2, 0)
      : cyl(r, r * (p.style === 'drum' ? 1 : 0.85), p.thick, c, 0, -p.thick / 2, 0, 14);
    g.add(body);
    if (p.style === 'drum') g.add(cyl(r * 1.01, r * 1.01, 0.06, '#f4efe6', 0, -0.02, 0, 14), cyl(r * 1.02, r * 1.02, 0.08, '#ffc24b', 0, -p.thick * 0.7, 0, 14));
    if (p.style === 'rangoli' || p.spin) g.add(cyl(r * 0.78, r * 0.78, 0.03, '#e8355a', 0, 0.01, 0, 12), cyl(r * 0.5, r * 0.5, 0.04, '#22b8a0', 0, 0.02, 0, 10),
      cyl(r * 0.22, r * 0.22, 0.05, '#ffffff', 0, 0.03, 0, 8), box(r * 1.5, 0.045, 0.14, '#ffffff', 0, 0.02, 0));
    if (p.style === 'lotus') g.add(ball(0.22, '#ff6fa8', r * 0.55, 0.12, r * 0.3, 0));
  } else {
    const body = box(p.wid, p.thick, p.len, c, 0, -p.thick / 2, 0);
    g.add(body);
    if (p.style === 'crate' || p.style === 'roof') g.add(box(p.wid * 1.02, 0.1, p.len * 1.02, p.style === 'roof' ? '#7b3a2a' : '#7a4a22', 0, -p.thick + 0.05, 0));
    if (p.style === 'bamboo') for (const s of [-1, 1]) g.add(cyl(0.09, 0.09, p.len, '#6f9d3e', s * (p.wid / 2 - 0.08), 0.02, 0, 6).rotateX(Math.PI / 2));
    g.rotation.y = -Math.atan2(p.ux, -p.uz);
  }
  if (p.pad) g.add(at(new Mesh(new TorusGeometry(p.len * 0.36, 0.07, 6, 24), light('#ffd166')), 0, 0.04, 0).rotateX(Math.PI / 2), at(glow(2.2, 0.55), 0, 0.3, 0));
  return g;
}

/** A lamp post that lights up when the player reaches its checkpoint. */
export function lampPost() {
  const lamp = ball(0.2, '#5a4a6a', 0, 1.75, 0, 1);
  const halo = at(glow(1.8, 0.8), 0, 1.75, 0);
  halo.visible = false;
  return { root: group(cyl(0.05, 0.07, 1.6, '#3b3450', 0, 0.8, 0, 6), lamp, halo), lamp, halo };
}
