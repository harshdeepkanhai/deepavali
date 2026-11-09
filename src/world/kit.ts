// Low-poly pieces shared by the 3D journey and the 3D runner. Everything is built in code from
// primitives in the icon set's colours: no model or image files (see build-3d-vertical-world).
import {
  AdditiveBlending, BoxGeometry, BufferGeometry, CanvasTexture, Color, ConeGeometry, CylinderGeometry, DoubleSide,
  Float32BufferAttribute, Group, IcosahedronGeometry, LatheGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  Object3D, PointLight, Points, PointsMaterial, Shape, ShapeGeometry, Sprite, SpriteMaterial, Texture, TorusGeometry, Vector2,
} from 'three';

const solid = new Map<string, MeshStandardMaterial>();
/** Flat-shaded, shared material for a colour (metal > 0 for gold). */
export function mat(color: string, metal = 0): MeshStandardMaterial {
  const key = color + '|' + metal;
  let m = solid.get(key);
  if (!m) {
    m = new MeshStandardMaterial({ color, flatShading: true, roughness: metal ? 0.35 : 0.85, metalness: metal });
    solid.set(key, m);
  }
  return m;
}

const lit = new Map<string, MeshBasicMaterial>();
/** Unlit material: flames, eyes, glowing things. */
export function light(color: string): MeshBasicMaterial {
  let m = lit.get(color);
  if (!m) { m = new MeshBasicMaterial({ color }); lit.set(color, m); }
  return m;
}

export function at<T extends Object3D>(o: T, x = 0, y = 0, z = 0): T {
  o.position.set(x, y, z);
  return o;
}
export const group = (...kids: Object3D[]) => { const g = new Group(); if (kids.length) g.add(...kids); return g; };
export const box = (w: number, h: number, d: number, c: string, x = 0, y = 0, z = 0, metal = 0) =>
  at(new Mesh(new BoxGeometry(w, h, d), mat(c, metal)), x, y, z);
export const cyl = (rt: number, rb: number, h: number, c: string, x = 0, y = 0, z = 0, seg = 8, metal = 0) =>
  at(new Mesh(new CylinderGeometry(rt, rb, h, seg), mat(c, metal)), x, y, z);
export const cone = (r: number, h: number, seg: number, c: string, x = 0, y = 0, z = 0) =>
  at(new Mesh(new ConeGeometry(r, h, seg), mat(c)), x, y, z);
export const ball = (r: number, c: string, x = 0, y = 0, z = 0, detail = 1, metal = 0) =>
  at(new Mesh(new IcosahedronGeometry(r, detail), mat(c, metal)), x, y, z);

let glowTex: Texture | null = null;
function glowTexture(): Texture {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,236,170,1)');
  g.addColorStop(0.3, 'rgba(255,176,64,0.55)');
  g.addColorStop(1, 'rgba(255,140,30,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  return (glowTex = new CanvasTexture(c));
}

/** A soft additive halo, the cheap stand-in for bloom. */
export function glow(size: number, opacity = 1): Sprite {
  const s = new Sprite(new SpriteMaterial({ map: glowTexture(), blending: AdditiveBlending, depthWrite: false, transparent: true, opacity }));
  s.scale.set(size, size, 1);
  return s;
}

/** Many halos in one draw call (lamps along a path). */
export function glowPoints(count: number, size: number): Points {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(new Float32Array(count * 3), 3));
  return new Points(g, new PointsMaterial({ map: glowTexture(), size, sizeAttenuation: true, blending: AdditiveBlending, depthWrite: false, transparent: true }));
}

export const bowlGeometry = new LatheGeometry(
  [new Vector2(0, 0), new Vector2(0.16, 0.01), new Vector2(0.28, 0.08), new Vector2(0.34, 0.16), new Vector2(0.31, 0.18)], 9);
export const flameGeometry = new ConeGeometry(0.075, 0.24, 6);

/** A clay diya; lit ones carry a flame and a halo. */
export function diya(isLit = true): Group {
  const g = group(new Mesh(bowlGeometry, mat('#9a6431')));
  if (isLit) g.add(at(new Mesh(flameGeometry, light('#ffd166')), 0, 0.3, 0), at(glow(1), 0, 0.3, 0));
  return g;
}

/** Jyoti, the lamp spirit: a flame with a face, riding a little diya. */
export function jyoti(): Group {
  const body = at(new Mesh(new IcosahedronGeometry(0.32, 2), light('#ffb43a')), 0, 0.55, 0);
  body.scale.set(1, 1.3, 1);
  const tip = at(new Mesh(new ConeGeometry(0.17, 0.42, 8), light('#ffd166')), 0, 1.02, 0);
  const eye = new IcosahedronGeometry(0.05, 0);
  const halo = at(glow(2.6, 0.9), 0, 0.62, 0);
  const lamp = new PointLight('#ffb050', 10, 6, 1.5);
  lamp.position.set(0, 0.7, 0.3);
  return group(diya(false), body, tip,
    at(new Mesh(eye, light('#2a1a3a')), -0.1, 0.62, 0.3), at(new Mesh(eye, light('#2a1a3a')), 0.1, 0.62, 0.3),
    at(new Mesh(new IcosahedronGeometry(0.12, 1), light('#fff4d0')), 0, 0.42, 0.24), halo, lamp);
}

/** A small sailing ship, bow pointing to -z. */
export function ship(): Group {
  const hull = box(0.95, 0.38, 1.7, '#7a4a22', 0, 0.19, 0);
  const bow = at(new Mesh(new ConeGeometry(0.48, 0.7, 4), mat('#7a4a22')), 0, 0.19, -1.15);
  bow.rotation.set(-Math.PI / 2, Math.PI / 4, 0);
  bow.scale.set(1, 1, 0.55);
  const deck = box(0.8, 0.06, 1.5, '#b07a3c', 0, 0.4, 0);
  const mast = cyl(0.04, 0.05, 2.0, '#5a3410', 0, 1.35, 0.05);
  // Square sail across the ship, so it reads clearly from behind (the runner's camera) and the side.
  const sailShape = new Shape();
  sailShape.moveTo(-0.55, 0); sailShape.lineTo(0.55, 0); sailShape.lineTo(0.45, 1.05); sailShape.lineTo(-0.45, 1.05); sailShape.lineTo(-0.55, 0);
  const sailMat = new MeshStandardMaterial({ color: '#fff4e0', side: DoubleSide, flatShading: true });
  const sail = at(new Mesh(new ShapeGeometry(sailShape), sailMat), 0, 0.85, 0.12);
  sail.rotation.x = -0.12;
  const yard = box(1.2, 0.05, 0.05, '#5a3410', 0, 1.92, 0.1);
  const flag = box(0.28, 0.14, 0.02, '#e8355a', 0.14, 2.3, 0.05);
  return group(hull, bow, deck, mast, sail, yard, flag);
}

/** A palm tree. */
export function palm(x = 0, z = 0, h = 1.2): Group {
  const trunk = cyl(0.05, 0.08, h, '#8a5a2b', 0, h / 2, 0, 6);
  trunk.rotation.z = 0.12;
  const leaves = group();
  for (let i = 0; i < 6; i++) {
    const leaf = at(new Mesh(new ConeGeometry(0.12, 0.75, 4), mat('#3fb36b')), 0, 0, 0);
    leaf.rotation.set(Math.PI / 2.4, (i / 6) * Math.PI * 2, 0);
    leaf.translateY(0.32);
    leaves.add(leaf);
  }
  leaves.position.set(0.07, h, 0);
  return at(group(trunk, leaves), x, 0, z);
}

/** Half a ring of glowing lamps or bulbs, standing on the ground. */
export function lampArch(radius: number, ringColor: string, lampColor: string, n: number): Group {
  const ring = new Mesh(new TorusGeometry(radius, 0.05, 6, 18, Math.PI), mat(ringColor));
  const g = group(ring);
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI;
    g.add(at(new Mesh(new IcosahedronGeometry(0.07, 0), light(lampColor)), Math.cos(a) * radius, Math.sin(a) * radius, 0.02));
  }
  g.add(at(glow(radius * 3, 0.55), 0, radius * 0.6, 0));
  return g;
}

/** Night sky without a moon (Amavasya). */
export function starfield(n: number, width: number, height: number, z: number, y0: number): Points {
  const p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    p[i * 3] = (Math.random() - 0.5) * width;
    p[i * 3 + 1] = y0 + Math.random() * height;
    p[i * 3 + 2] = z - Math.random() * 12;
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(p, 3));
  return new Points(g, new PointsMaterial({ color: '#fff4e0', size: 0.14, transparent: true, opacity: 0.85, depthWrite: false }));
}

/** Darken a hex colour towards the night background. */
export const dim = (c: string, k: number) => '#' + new Color(c).lerp(new Color('#1a1030'), k).getHexString();

/** Free GPU memory for meshes created per game (shared materials stay cached). */
export function disposeTree(root: Object3D) {
  root.traverse(o => {
    const m = o as Mesh;
    if (m.geometry && m.geometry !== bowlGeometry && m.geometry !== flameGeometry) m.geometry.dispose();
  });
}
