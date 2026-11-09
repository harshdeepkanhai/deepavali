// The player character: a child traveller in a kurta, built from primitives, with procedural
// idle, run, jump and fall poses. An ordinary child with no religious markings, so every
// tradition in the journey can be visited by the same hero (design.md, decision 4).
import { Group } from 'three';
import { ball, box, cyl, group } from './kit';

const SKIN = '#b9784a', HAIR = '#22140d', KURTA = '#ff8a1f', TRIM = '#ffc24b', PANTS = '#f4efe6', SHOE = '#7a3412';

export interface Hero {
  root: Group;
  /** speed: 0..1 of a full run; air: off the ground; vy: vertical speed. */
  animate(dt: number, speed: number, air: boolean, vy: number): void;
  /** Squash on landing; strength 0..1. */
  land(strength: number): void;
}

/** A limb that hangs from a pivot at its top. */
function limb(len: number, r: number, color: string): Group {
  return group(cyl(r, r * 0.9, len, color, 0, -len / 2, 0, 7));
}

export function hero(): Hero {
  const legL = limb(0.56, 0.085, PANTS), legR = limb(0.56, 0.085, PANTS);
  legL.add(box(0.15, 0.09, 0.25, SHOE, 0, -0.56, 0.04));
  legR.add(box(0.15, 0.09, 0.25, SHOE, 0, -0.56, 0.04));
  legL.position.set(-0.11, 0.62, 0);
  legR.position.set(0.11, 0.62, 0);

  const armL = limb(0.42, 0.065, KURTA), armR = limb(0.42, 0.065, KURTA);
  armL.add(ball(0.068, SKIN, 0, -0.46, 0, 1));
  armR.add(ball(0.068, SKIN, 0, -0.46, 0, 1));
  armL.position.set(-0.25, 1.08, 0);
  armR.position.set(0.25, 1.08, 0);

  const head = group(
    ball(0.25, SKIN, 0, 0, 0, 1),
    ball(0.265, HAIR, 0, 0.05, -0.05, 1),
    ball(0.034, '#1a1020', -0.085, 0.01, 0.225, 0), ball(0.034, '#1a1020', 0.085, 0.01, 0.225, 0),
    ball(0.012, '#ffffff', -0.075, 0.025, 0.252, 0), ball(0.012, '#ffffff', 0.095, 0.025, 0.252, 0),
  );
  head.children[1].scale.set(1.02, 0.92, 1.02);
  head.position.set(0, 1.38, 0);

  // The kurta: a flared tunic with a gold hem and collar.
  const body = group(
    cyl(0.2, 0.27, 0.66, KURTA, 0, 0.81, 0, 8),
    cyl(0.275, 0.275, 0.05, TRIM, 0, 0.5, 0, 8),
    cyl(0.13, 0.13, 0.05, TRIM, 0, 1.14, 0, 8),
    box(0.04, 0.3, 0.02, TRIM, 0, 0.98, 0.205),
  );

  const fig = group(legL, legR, body, armL, armR, head);
  const root = group(fig);

  let ph = 0, t = 0, sq = 0, air0 = 0;
  // Current joint angles, eased towards each frame's target so poses blend.
  const cur = { lx: 0, rx: 0, alx: 0, arx: 0, alz: 0.08, arz: -0.08, lean: 0, bob: 0, head: 0 };
  const ease = (k: keyof typeof cur, v: number, rate: number) => { cur[k] += (v - cur[k]) * rate; };

  return {
    root,
    land(s) { sq = Math.max(sq, Math.min(1, s)); },
    animate(dt, speed, air, vy) {
      t += dt;
      const k = Math.min(1, speed), r = Math.min(1, dt * 14);
      air0 = air ? air0 + dt : 0;
      if (air && air0 > 0.06) {
        const falling = vy < -2;
        ease('lx', falling ? 0.35 : 0.75, r); ease('rx', falling ? -0.2 : -0.45, r);
        ease('alx', falling ? -1.4 : -2.5, r); ease('arx', falling ? -1.4 : -2.5, r);
        ease('alz', falling ? 0.9 : 0.35, r); ease('arz', falling ? -0.9 : -0.35, r);
        ease('lean', 0.12, r); ease('bob', 0, r); ease('head', falling ? -0.15 : 0.1, r);
      } else if (k > 0.05) {
        ph += dt * Math.PI * 2 * (1.2 + 1.5 * k);
        const s = Math.sin(ph) * (0.35 + 0.6 * k);
        ease('lx', s, r); ease('rx', -s, r);
        ease('alx', -s * 0.9, r); ease('arx', s * 0.9, r);
        ease('alz', 0.1, r); ease('arz', -0.1, r);
        ease('lean', 0.16 * k, r); ease('bob', Math.abs(Math.cos(ph)) * 0.06 * k, 1); ease('head', 0, r);
      } else {
        const sway = Math.sin(t * 1.6) * 0.03;
        ease('lx', 0, r); ease('rx', 0, r);
        ease('alx', sway, r); ease('arx', -sway, r);
        ease('alz', 0.08 + sway, r); ease('arz', -0.08 - sway, r);
        ease('lean', 0, r); ease('bob', 0, r); ease('head', Math.sin(t * 0.7) * 0.05, r);
      }
      legL.rotation.x = cur.lx; legR.rotation.x = cur.rx;
      armL.rotation.set(cur.alx, 0, cur.alz); armR.rotation.set(cur.arx, 0, cur.arz);
      head.rotation.y = cur.head;
      fig.rotation.x = cur.lean;
      sq = Math.max(0, sq - dt * 5);
      const breathe = k < 0.05 && !air ? Math.sin(t * 2.2) * 0.012 : 0;
      fig.scale.set(1 + sq * 0.12, 1 - sq * 0.2 + breathe, 1 + sq * 0.12);
      fig.position.y = cur.bob;
    },
  };
}
