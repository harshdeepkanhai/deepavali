// Input for the 3D journey in the layout mobile action games use: a floating joystick under the
// left thumb, look-around by dragging on the right, and jump and action buttons. Pointers are
// tracked by id, so moving, looking and jumping work at the same time. The mouse always looks
// around; keys move (design.md, decision 5).
import { ic } from '../core/icons.js';

export interface Input {
  mx: number; my: number;        // move, -1..1 (my > 0 is away from the camera)
  lookX: number; lookY: number;  // pixels dragged since the world last read them
  turn: number;                  // -1..1 from the Q and E keys
  jumps: number;                 // jump presses not yet used
  jumpHeld: boolean;
  acts: number;                  // action presses not yet used
  lookAt: number;                // time of the last look input
}

export interface Controls {
  el: HTMLElement;
  input: Input;
  setAction(html: string, label: string): void;
  clearAction(): void;
  attach(): void;
  detach(): void;
}

const STICK = 56;   // joystick radius in pixels

export function controls(jumpLabel: string, onMap: () => void, enabled: () => boolean): Controls {
  const el = document.createElement('div');
  el.className = 'w3-in';
  el.innerHTML = `<div class="w3-stick" aria-hidden="true"><i></i></div>
<button class="w3-act" type="button" hidden></button>
<button class="w3-jump" type="button" aria-label="${jumpLabel}">${ic('fwd')}</button>`;
  const stick = el.querySelector('.w3-stick') as HTMLElement, knob = stick.firstElementChild as HTMLElement;
  const act = el.querySelector('.w3-act') as HTMLButtonElement, jump = el.querySelector('.w3-jump') as HTMLButtonElement;
  const input: Input = { mx: 0, my: 0, lookX: 0, lookY: 0, turn: 0, jumps: 0, jumpHeld: false, acts: 0, lookAt: 0 };

  let stickId = -1, lookId = -1, sx = 0, sy = 0, lx = 0, ly = 0;
  const keys = new Set<string>();
  const keyMove = () => {
    if (stickId >= 0) return;
    const x = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0), y = (keys.has('u') ? 1 : 0) - (keys.has('d') ? 1 : 0);
    const m = Math.hypot(x, y) || 1;
    input.mx = x / m; input.my = y / m;
    input.turn = (keys.has('te') ? 1 : 0) - (keys.has('tq') ? 1 : 0);
  };
  const stickTo = (x: number, y: number) => {
    let dx = x - sx, dy = y - sy;
    const m = Math.hypot(dx, dy);
    if (m > STICK) { dx *= STICK / m; dy *= STICK / m; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    const k = Math.min(1, m / STICK), dead = k < 0.12 ? 0 : 1;
    input.mx = (dx / STICK) * dead;
    input.my = (-dy / STICK) * dead;
  };
  const release = (id: number) => {
    if (id === stickId) {
      stickId = -1; input.mx = input.my = 0;
      knob.style.transform = '';
      stick.classList.remove('on');
      stick.style.left = stick.style.top = '';
    }
    if (id === lookId) lookId = -1;
  };

  const down = (e: PointerEvent) => {
    if (!enabled() || (e.target as HTMLElement).closest('button')) return;
    const r = el.getBoundingClientRect();
    if (e.pointerType !== 'mouse' && e.clientX - r.left < r.width * 0.45 && stickId < 0) {
      stickId = e.pointerId; sx = e.clientX; sy = e.clientY;
      stick.classList.add('on');
      stick.style.left = sx - r.left + 'px';
      stick.style.top = sy - r.top + 'px';
      stickTo(sx, sy);
    } else if (lookId < 0) {
      lookId = e.pointerId; lx = e.clientX; ly = e.clientY;
    } else return;
    try { el.setPointerCapture(e.pointerId); } catch { /* the pointer is already gone */ }
    e.preventDefault();
  };
  const move = (e: PointerEvent) => {
    if (e.pointerId === stickId) stickTo(e.clientX, e.clientY);
    else if (e.pointerId === lookId) {
      input.lookX += e.clientX - lx; input.lookY += e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      input.lookAt = performance.now();
    }
  };
  const up = (e: PointerEvent) => release(e.pointerId);

  const jumpDown = (e: PointerEvent) => {
    e.preventDefault();
    if (!enabled()) return;
    input.jumps++; input.jumpHeld = true;
    jump.classList.add('on');
  };
  const jumpUp = () => { input.jumpHeld = false; jump.classList.remove('on'); };
  // Keyboard activation of the focused button (Enter or Space) arrives as a click with detail 0.
  const jumpClick = (e: MouseEvent) => { if (e.detail === 0 && enabled()) input.jumps++; };
  const actClick = () => { if (enabled()) input.acts++; act.blur(); };

  const CODES: Record<string, string> = {
    KeyW: 'u', ArrowUp: 'u', KeyS: 'd', ArrowDown: 'd', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r', KeyQ: 'tq', KeyE: 'te',
  };
  const kd = (e: KeyboardEvent) => {
    if (!enabled() || e.ctrlKey || e.metaKey || e.altKey) return;
    const onButton = (e.target as HTMLElement).closest?.('button');
    const k = CODES[e.code] || CODES[e.key];
    if (k) { keys.add(k); keyMove(); e.preventDefault(); return; }
    if (e.code === 'Space' && !onButton) {
      e.preventDefault();
      if (!e.repeat) input.jumps++;
      input.jumpHeld = true;
    } else if ((e.code === 'KeyF' || (e.key === 'Enter' && !onButton)) && !e.repeat) {
      e.preventDefault();
      input.acts++;
    } else if (e.code === 'KeyM' && !e.repeat) {
      e.preventDefault();
      onMap();
    }
  };
  const ku = (e: KeyboardEvent) => {
    const k = CODES[e.code] || CODES[e.key];
    if (k) { keys.delete(k); keyMove(); }
    if (e.code === 'Space') input.jumpHeld = false;
  };
  const blur = () => {
    keys.clear(); keyMove();
    release(stickId); release(lookId);
    jumpUp();
  };

  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('lostpointercapture', up);
  jump.addEventListener('pointerdown', jumpDown);
  jump.addEventListener('pointerup', jumpUp);
  jump.addEventListener('pointercancel', jumpUp);
  jump.addEventListener('pointerleave', jumpUp);
  jump.addEventListener('click', jumpClick);
  act.addEventListener('click', actClick);
  el.addEventListener('contextmenu', e => e.preventDefault());

  return {
    el, input,
    setAction(html, label) {
      if (act.hidden || act.dataset.k !== label) { act.innerHTML = html; act.setAttribute('aria-label', label); act.dataset.k = label; }
      act.hidden = false;
    },
    clearAction() { act.hidden = true; },
    attach() {
      addEventListener('keydown', kd);
      addEventListener('keyup', ku);
      addEventListener('blur', blur);
    },
    detach() {
      removeEventListener('keydown', kd);
      removeEventListener('keyup', ku);
      removeEventListener('blur', blur);
      blur();
      input.jumps = input.acts = 0;
      input.lookX = input.lookY = 0;
    },
  };
}
