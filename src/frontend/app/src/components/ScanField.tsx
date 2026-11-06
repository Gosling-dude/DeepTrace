import { useEffect, useRef, useState } from 'react';
import { startField, type FieldHandle } from './fieldRuntime';

/**
 * Animated "scan" field: the product in one loop.
 *
 * A portrait, drawn as a dot matrix the way the model reads pixels, is swept
 * by a scan line. Behind the line, the regions a face-swap detector reacts to
 * (eyes, mouth, the blend along the jaw) turn the signal colour. A face box
 * and a climbing score then settle on a verdict, hold, and the loop restarts.
 *
 * The portrait is procedural (no photograph), so there is no real person in it.
 */

const FRAG = `
precision highp float;

uniform vec2  u_center;  // px, origin bottom-left: centre of the picture frame
uniform float u_half;    // px: half the frame height
uniform float u_grid;    // px: dot pitch
uniform float u_scan;    // frame units: y of the scan line (1 top, -1 bottom)
uniform float u_line;    // 0..1: scan line visibility
uniform float u_env;     // 0..1: how much of the analysis result is showing
uniform float u_time;
uniform float u_dpr;
uniform vec3  u_bg;
uniform vec3  u_fg;
uniform vec3  u_sig;
uniform float u_invert;  // 1 on a light ground: tones are drawn inverted, like print

const vec2 HC = vec2(0.0, 0.22);   // head centre
const vec2 HR = vec2(0.36, 0.46);  // head radii

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float blob(vec2 p, vec2 c, vec2 r) {
  vec2 d = (p - c) / r;
  return exp(-dot(d, d));
}

// The face narrows from cheekbones to chin.
float jaw(float y) {
  return mix(1.0, 0.78, smoothstep(0.22, -0.24, y));
}

vec2 headSpace(vec2 u) {
  return vec2(u.x / (HR.x * jaw(u.y)), (u.y - HC.y) / HR.y);
}

// Luminance of a studio-lit bust at frame coordinate u.
float portrait(vec2 u) {
  vec3 l = normalize(vec3(-0.34, 0.36, 0.87));

  // Backdrop: a soft pool of light behind the head, falling off to the edges.
  float lum = 0.028 + 0.075 * blob(u, vec2(0.0, 0.2), vec2(0.75, 0.85));

  // Shoulders.
  vec2 tq = (u - vec2(0.0, -1.25)) / vec2(0.95, 0.75);
  float th = 1.0 - dot(tq, tq);
  if (th > 0.0) {
    vec3 n = normalize(vec3(tq, sqrt(th)));
    float tl = 0.08 + 0.3 * max(dot(n, l), 0.0);
    lum = mix(lum, tl, smoothstep(0.0, 0.05, th));
  }

  // Neck, darker under the jaw.
  float neckW = mix(0.17, 0.23, smoothstep(-0.2, -0.6, u.y));
  if (abs(u.x) < neckW && u.y < 0.0 && u.y > -0.62) {
    float nx = u.x / neckW;
    vec3 n = normalize(vec3(nx, 0.15, sqrt(max(1.0 - nx * nx, 0.0))));
    float nl = 0.08 + 0.4 * max(dot(n, l), 0.0);
    nl *= mix(0.35, 1.0, smoothstep(-0.2, -0.46, u.y));
    float edge = smoothstep(1.0, 0.86, abs(nx));
    lum = mix(lum, nl, edge * smoothstep(-0.62, -0.5, u.y));
  }

  // Face.
  vec2 hq = headSpace(u);
  float hh = 1.0 - dot(hq, hq);
  if (hh > 0.0) {
    vec3 n = normalize(vec3(hq, sqrt(hh)));
    float diff = max(dot(n, l), 0.0);
    float hl = 0.1 + 0.7 * diff;

    hl *= 1.0 - 0.62 * blob(u, vec2(-0.135, 0.27), vec2(0.082, 0.046));  // eye sockets
    hl *= 1.0 - 0.62 * blob(u, vec2( 0.135, 0.27), vec2(0.082, 0.046));
    hl *= 1.0 - 0.8 * blob(u, vec2(-0.135, 0.268), vec2(0.034, 0.024));  // irises
    hl *= 1.0 - 0.8 * blob(u, vec2( 0.135, 0.268), vec2(0.034, 0.024));
    hl *= 1.0 - 0.7 * blob(u, vec2(-0.14, 0.345), vec2(0.09, 0.018));    // brows
    hl *= 1.0 - 0.7 * blob(u, vec2( 0.14, 0.345), vec2(0.09, 0.018));
    hl += 0.1 * blob(u, vec2(-0.015, 0.17), vec2(0.022, 0.11));           // nose ridge
    hl *= 1.0 - 0.5 * blob(u, vec2(0.05, 0.13), vec2(0.035, 0.09));       // nose shadow
    hl *= 1.0 - 0.6 * blob(u, vec2(0.0, 0.048), vec2(0.062, 0.02));       // under the nose
    hl *= 1.0 - 0.72 * blob(u, vec2(0.0, -0.05), vec2(0.1, 0.02));        // mouth
    hl += 0.05 * blob(u, vec2(0.0, -0.092), vec2(0.07, 0.02));            // lower lip
    hl *= 1.0 - 0.18 * blob(u, vec2(0.0, -0.2), vec2(0.2, 0.03));         // under the lip / chin

    lum = mix(lum, hl, smoothstep(0.0, 0.06, hh));
  }

  // Hair: a mass slightly larger than the skull, above the hairline and down the sides.
  vec2 aq = (u - vec2(0.0, 0.27)) / vec2(0.405, 0.475);
  float ah = 1.0 - dot(aq, aq);
  if (ah > 0.0) {
    float hairline = 0.47 - 1.1 * u.x * u.x;
    float onTop = smoothstep(hairline - 0.02, hairline + 0.03, u.y);
    float onSides = (1.0 - smoothstep(0.0, 0.05, hh)) * smoothstep(0.12, 0.2, u.y);
    vec3 n2 = normalize(vec3(aq, sqrt(ah)));
    float hairL = 0.05 + 0.2 * max(dot(n2, l), 0.0) + 0.05 * vnoise(vec2(u.x * 26.0, u.y * 7.0));
    lum = mix(lum, hairL, smoothstep(0.0, 0.05, ah) * max(onTop, onSides));
  }

  return clamp(lum, 0.0, 1.0);
}

// Where the detector reacted. Uneven patches, like a real saliency map:
// around one eye, along the jaw where a swapped face is blended in, by the mouth.
float heat(vec2 u) {
  vec2 hq = headSpace(u);
  if (dot(hq, hq) > 1.0) return 0.0;
  float eyeL  = max(blob(u, vec2(-0.25, 0.2), vec2(0.065, 0.12)), blob(u, vec2(-0.2, 0.37), vec2(0.09, 0.04)) * 0.8);
  float eyeR  = blob(u, vec2(0.13, 0.25), vec2(0.07, 0.04)) * 0.5;
  float jawR  = max(blob(u, vec2(0.21, -0.02), vec2(0.075, 0.15)), blob(u, vec2(0.13, -0.18), vec2(0.1, 0.05)) * 0.8);
  float mouth = blob(u, vec2(0.05, -0.07), vec2(0.1, 0.045)) * 0.75;
  float nz = 0.65 * vnoise(u * 10.0 + 3.7) + 0.35 * vnoise(u * 23.0 - 1.3);
  float h = max(max(eyeL, eyeR), max(jawR, mouth)) * (0.35 + 1.15 * nz);
  return smoothstep(0.2, 0.85, h);
}

void main() {
  vec2 rel = gl_FragCoord.xy - u_center;
  vec2 uf = rel / u_half;                       // this pixel, frame units

  // Snap to the dot grid: every dot samples the picture at its own centre.
  vec2 cell = floor(rel / u_grid);
  vec2 cc = (cell + 0.5) * u_grid;
  vec2 u = cc / u_half;
  float inFrame = step(abs(u.x), 0.8) * step(abs(u.y), 1.0);

  float lum = pow(portrait(u), 1.45);
  // Dot size carries tone. On a light ground a dark dot means shadow, so flip.
  float ink = mix(lum, (1.0 - lum * 1.6) * 0.8, u_invert);
  float scanned = smoothstep(u_scan, u_scan + 0.04, u.y);
  float lit = mix(0.36, 1.0, scanned * u_env);
  float trail = exp(-max(u.y - u_scan, 0.0) / 0.14) * step(u_scan, u.y) * u_line;
  float h = heat(u) * smoothstep(u_scan + 0.02, u_scan + 0.16, u.y) * u_env;

  float tw = hash(cell + floor(u_time * 5.0) * 7.3);
  float rad = u_grid * 0.5 * sqrt(clamp(ink * (0.92 + 0.16 * tw), 0.0, 1.0)) * 0.96;
  rad = mix(rad, max(rad, u_grid * 0.42), smoothstep(0.1, 0.7, h));
  float aa = u_dpr * 0.75;
  float dotMask = (1.0 - smoothstep(rad - aa, rad + aa, length(rel - cc))) * inFrame;

  // Heat ramps from the foreground through a midpoint to the signal colour.
  vec3 warm = mix(u_fg, u_sig, 0.6);
  vec3 hot = mix(warm, u_sig, smoothstep(0.35, 0.8, h));
  float tone = 0.5 + 0.5 * smoothstep(0.0, 0.5, ink);
  float strength = clamp(tone * min(lit + 0.45 * trail, 1.15), 0.0, 1.0);
  vec3 dotCol = mix(mix(u_bg, u_fg, strength), hot, smoothstep(0.0, 0.3, h));
  vec3 col = mix(u_bg, dotCol, dotMask);
  col = mix(col, u_sig, h * 0.07 * inFrame);

  // Scan line with a short glow.
  float inX = step(abs(uf.x), 0.86);
  float ld = abs(uf.y - u_scan) * u_half;
  col = mix(col, u_fg, (1.0 - smoothstep(0.0, 1.2 * u_dpr, ld)) * 0.9 * u_line * inX);
  col = mix(col, u_fg, exp(-ld / (9.0 * u_dpr)) * 0.09 * u_line * inX);

  gl_FragColor = vec4(col, 1.0);
}
`;

/** Where the picture frame sits: centre and height, as fractions of the container. */
export interface FramePlacement {
  x: number;
  y: number;
  h: number;
}

interface Props {
  frame?: FramePlacement;
  /** Placement used when the container is narrower than 768px. */
  frameNarrow?: FramePlacement;
  paused?: boolean;
  className?: string;
}

/* ─── Timeline (seconds within one loop) ─── */
const LOOP = 10;
const SCAN_START = 0.6;
const SCAN_END = 4.4;
const FADE_START = 8.6;
const FADE_END = 9.6;
const STILL = 6.5; // result fully showing
const SCORE = 93.4;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export default function ScanField({
  frame = { x: 0.5, y: 0.5, h: 0.7 },
  frameNarrow,
  paused = false,
  className = '',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const handleRef = useRef<FieldHandle | null>(null);
  const pausedRef = useRef(paused);
  const [failed, setFailed] = useState(false);

  pausedRef.current = paused;
  const placementRef = useRef({ wide: frame, narrow: frameNarrow ?? frame });
  placementRef.current = { wide: frame, narrow: frameNarrow ?? frame };
  const narrowKey = frameNarrow ? `${frameNarrow.x},${frameNarrow.y},${frameNarrow.h}` : '';

  useEffect(() => {
    handleRef.current?.redraw();
  }, [frame.x, frame.y, frame.h, narrowKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Last values written to the DOM, so the overlay is only touched on change.
    const lastDom = { geom: '', flagged: null as boolean | null, score: '', boxO: -1, tagO: -1 };

    const handle = startField(canvas, {
      frag: FRAG,
      still: STILL,
      startAt: 0.2,
      isPaused: () => pausedRef.current,
      render: ({ gl, u, cssW, cssH, dpr, time }) => {
        const narrow = cssW < 768;
        const place = narrow ? placementRef.current.narrow : placementRef.current.wide;

        // Frame geometry in CSS px. The frame is 4:5 and never wider than its column.
        const maxW = narrow ? cssW * 0.86 : cssW * 0.4;
        const H = Math.min(place.h * cssH, maxW / 0.8);
        const W = H * 0.8;
        const cx = place.x * cssW;
        const cy = place.y * cssH;
        const grid = Math.min(7, Math.max(4, H / 104));

        // Timeline.
        const t = ((time % LOOP) + LOOP) % LOOP;
        const s = clamp01((t - SCAN_START) / (SCAN_END - SCAN_START));
        const scanY = 1.08 - 2.16 * s;
        const env = 1 - smooth(FADE_START, FADE_END, t);
        const line = smooth(SCAN_START - 0.3, SCAN_START, t) * (1 - smooth(SCAN_END - 0.1, SCAN_END + 0.4, t));

        gl.uniform2f(u('u_center'), cx * dpr, (cssH - cy) * dpr);
        gl.uniform1f(u('u_half'), (H / 2) * dpr);
        gl.uniform1f(u('u_grid'), grid * dpr);
        gl.uniform1f(u('u_scan'), scanY);
        gl.uniform1f(u('u_line'), line);
        gl.uniform1f(u('u_env'), env);
        gl.uniform1f(u('u_time'), time);
        gl.uniform1f(u('u_dpr'), dpr);

        // Overlay: frame marks, face box, verdict tag.
        const frameEl = frameRef.current;
        if (frameEl) {
          const geom = `${(cx - W / 2).toFixed(1)}|${(cy - H / 2).toFixed(1)}|${W.toFixed(1)}|${H.toFixed(1)}`;
          if (geom !== lastDom.geom) {
            lastDom.geom = geom;
            frameEl.style.left = `${cx - W / 2}px`;
            frameEl.style.top = `${cy - H / 2}px`;
            frameEl.style.width = `${W}px`;
            frameEl.style.height = `${H}px`;
          }
        }

        const tagO = smooth(1.2, 1.6, t) * env;
        const boxO = smooth(3.0, 3.5, t) * env;
        const flagged = t >= SCAN_END;
        const score = `${(SCORE * (1 - Math.pow(1 - clamp01((t - 1.3) / (SCAN_END - 1.3)), 2.2))).toFixed(1)}%`;

        if (boxRef.current && Math.abs(boxO - lastDom.boxO) > 0.004) {
          lastDom.boxO = boxO;
          boxRef.current.style.borderColor = `rgb(var(--c-signal-500) / ${(boxO * 0.95).toFixed(3)})`;
        }
        if (tagRef.current && Math.abs(tagO - lastDom.tagO) > 0.004) {
          lastDom.tagO = tagO;
          tagRef.current.style.opacity = tagO.toFixed(3);
        }
        if (labelRef.current && flagged !== lastDom.flagged) {
          lastDom.flagged = flagged;
          labelRef.current.textContent = flagged ? 'Likely deepfake' : 'Analyzing';
          tagRef.current?.classList.toggle('is-flagged', flagged);
        }
        if (scoreRef.current && score !== lastDom.score) {
          lastDom.score = score;
          scoreRef.current.textContent = score;
        }
      },
    });

    if (!handle) {
      setFailed(true);
      return;
    }
    handleRef.current = handle;
    return () => {
      handleRef.current = null;
      handle.destroy();
    };
  }, []);

  if (failed) {
    return <div aria-hidden="true" className={className} style={{ background: 'var(--well)' }} />;
  }

  const corner = 'absolute w-3 h-3 border-bone/45';

  return (
    <div aria-hidden="true" className={className}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Picture frame: positioned by the render loop to match the canvas. */}
      <div ref={frameRef} className="absolute pointer-events-none">
        <span className={`${corner} -left-2 -top-2 border-l border-t`} />
        <span className={`${corner} -right-2 -top-2 border-r border-t`} />
        <span className={`${corner} -left-2 -bottom-2 border-l border-b`} />
        <span className={`${corner} -right-2 -bottom-2 border-r border-b`} />

        {/* Face box. Matches the head in the shader: x ±0.40, y -0.28..0.72 in frame units. */}
        <div
          ref={boxRef}
          className="absolute border"
          style={{ left: '25%', top: '14%', width: '50%', height: '50%', borderColor: 'rgb(var(--c-signal-500) / 0.95)' }}
        >
          <span
            ref={tagRef}
            className="scan-tag absolute left-[-1px] bottom-full mb-2 inline-flex whitespace-nowrap"
          >
            <span className="scan-tag-chip tag">
              <span className="scan-tag-dot w-1.5 h-1.5 rounded-full" />
              <span ref={labelRef}>Likely deepfake</span>
              <span ref={scoreRef} className="num text-bone pl-2 ml-1 border-l border-line-strong">
                {SCORE.toFixed(1)}%
              </span>
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
