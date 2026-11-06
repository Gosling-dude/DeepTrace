/**
 * Shared runtime for the full-bleed shader backgrounds.
 *
 * One WebGL context, one fullscreen triangle, one fragment shader. Handles
 * sizing, the ~30fps loop, pausing when off-screen or hidden, and the still
 * frame used under reduced motion. Each field supplies its shader and a
 * `render` callback that sets uniforms for the current time.
 *
 * Colours come from the active palette and are passed to every shader as
 * `u_bg`, `u_fg`, `u_sig` and `u_invert` (1 when the ground is light).
 */

import { onThemeChange, readFieldColors } from '../theme';

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

export interface FieldFrame {
  gl: WebGLRenderingContext;
  /** Cached uniform lookup. */
  u: (name: string) => WebGLUniformLocation | null;
  cssW: number;
  cssH: number;
  dpr: number;
  /** Seconds on the field's own clock. Frozen while paused. */
  time: number;
}

export interface FieldHandle {
  redraw: () => void;
  destroy: () => void;
}

interface Options {
  frag: string;
  /** Clock value for the still shown under reduced motion. */
  still: number;
  /** Clock value the animation starts from. Defaults to `still`. */
  startAt?: number;
  isPaused: () => boolean;
  render: (frame: FieldFrame) => void;
}

const MAX_DPR = 1.5;

export function startField(canvas: HTMLCanvasElement, { frag, still, startAt, isPaused, render }: Options): FieldHandle | null {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) return null;

  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      if (import.meta.env.DEV) console.warn('[field] shader compile failed:', gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  };

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, frag);
  const prog = gl.createProgram();
  if (!vs || !fs || !prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uniforms = new Map<string, WebGLUniformLocation | null>();
  const u = (name: string) => {
    if (!uniforms.has(name)) uniforms.set(name, gl.getUniformLocation(prog, name));
    return uniforms.get(name) ?? null;
  };

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let colors = readFieldColors();

  let dpr = 1;
  let cssW = 0;
  let cssH = 0;
  let clock = reduced ? still : startAt ?? still;
  let raf = 0;
  let visible = true;
  let last = 0;
  let prev = performance.now();

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    cssW = rect.width;
    cssH = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const w = Math.max(1, Math.round(cssW * dpr));
    const h = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  };

  const draw = () => {
    if (cssW === 0 || cssH === 0) return;
    gl.uniform3fv(u('u_bg'), colors.bg);
    gl.uniform3fv(u('u_fg'), colors.fg);
    gl.uniform3fv(u('u_sig'), colors.signal);
    gl.uniform1f(u('u_invert'), colors.invert);
    render({ gl, u, cssW, cssH, dpr, time: clock });
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (now - last < 30) return; // ~30fps is plenty for these fields
    const dt = Math.min(0.1, (now - prev) / 1000);
    prev = now;
    last = now;
    if (!isPaused()) clock += dt;
    draw();
  };

  const start = () => {
    if (raf || reduced || !visible || document.hidden) return;
    prev = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  const onVisibility = () => (document.hidden ? stop() : start());

  const ro = new ResizeObserver(() => {
    resize();
    draw();
  });
  ro.observe(canvas);
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start();
    else stop();
  });
  io.observe(canvas);
  document.addEventListener('visibilitychange', onVisibility);
  const offTheme = onThemeChange(() => {
    colors = readFieldColors();
    draw();
  });

  // First frame is drawn synchronously so there is never an empty canvas.
  resize();
  draw();
  start();

  return {
    redraw: draw,
    destroy: () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      offTheme();
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
    },
  };
}
