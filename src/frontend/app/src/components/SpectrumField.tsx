import { useEffect, useRef, useState } from 'react';
import { startField, type FieldHandle } from './fieldRuntime';

/**
 * Animated frequency-spectrum field.
 *
 * It depicts what the frequency stream looks at: the 2D spectrum of an image.
 * Natural content piles up at the centre and along the axes; upsampling in
 * generative models adds a lattice of periodic peaks, drawn in the signal
 * colour. A pulse travels outward through the lattice every few seconds.
 */

const FRAG = `
precision highp float;

uniform float u_time;
uniform vec2  u_center;   // px, origin bottom-left
uniform float u_scale;    // px per unit
uniform float u_dpr;
uniform vec3  u_bg;
uniform vec3  u_fg;
uniform vec3  u_sig;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 p = (frag - u_center) / u_scale;
  float r = length(p);

  // Speckle: spectra are noisy. Stepped at 8Hz and cross-faded.
  vec2 cell = floor(frag / (2.0 * u_dpr));
  float tt = u_time * 8.0;
  float t0 = floor(tt);
  float n = mix(hash(cell + t0 * 13.7), hash(cell + (t0 + 1.0) * 13.7), smoothstep(0.0, 1.0, fract(tt)));
  float speck = sqrt(-log(max(n, 0.002))) * 0.75;

  // Natural image energy: 1/f falloff plus streaks along both axes.
  float e = 1.0 / (1.0 + pow(r * 6.5, 2.3));
  float ax = exp(-abs(p.y) * 70.0) / (1.0 + abs(p.x) * 5.0);
  float ay = exp(-abs(p.x) * 70.0) / (1.0 + abs(p.y) * 5.0);
  e = e * 1.1 + (ax + ay) * 0.3 + 0.012;
  float v = e * speck;
  v = v / (1.0 + v * 0.6);

  // Frequency rings.
  float rr = r * 4.0;
  float dr = abs(rr - floor(rr + 0.5)) / 4.0 * u_scale;
  float ring = (1.0 - smoothstep(0.0, u_dpr, dr)) * step(0.3, r) * smoothstep(2.2, 1.2, r);

  // Artifact lattice: periodic peaks at multiples of the upsampling frequency.
  const float S = 0.25;
  vec2 q = p / S;
  vec2 id = floor(q + 0.5);
  vec2 f = (q - id) * S;
  float d = length(f);
  float idr = length(id) * S;
  float w = hash(id + 71.3);
  float onAxis = (id.x == 0.0 || id.y == 0.0 || abs(id.x) == abs(id.y)) ? 1.0 : 0.45;
  float strength = exp(-idr * 0.9) * (0.4 + 0.6 * w) * onAxis;

  float ph = fract(u_time / 7.0);
  float pulse = exp(-pow((idr - ph * 2.4) * 4.0, 2.0)) * (1.0 - ph);

  float breath = 0.5 + 0.5 * sin(u_time * 0.7 + w * 6.2831);
  float amp = strength * (0.3 + 0.3 * breath + 1.6 * pulse);
  amp *= step(0.5, length(id));

  float core = exp(-d * d / (0.010 * 0.010));
  float halo = exp(-d * d / (0.045 * 0.045));
  float flare = exp(-abs(f.x) * 260.0) * exp(-abs(f.y) * 38.0)
              + exp(-abs(f.y) * 260.0) * exp(-abs(f.x) * 38.0);

  // Everything is blended toward palette colours, so the field works on
  // light and dark grounds alike.
  vec3 col = mix(u_bg, u_fg, clamp(v * 0.5, 0.0, 1.0));
  col = mix(col, u_fg, ring * 0.045);
  col = mix(col, u_sig, clamp(amp * (halo * 0.35 + flare * 0.5), 0.0, 1.0));
  col = mix(col, mix(u_sig, u_fg, 0.35), clamp(amp * core * 1.4, 0.0, 1.0));

  col = mix(u_bg, col, smoothstep(2.3, 0.9, r));
  col += (hash(frag + 0.5) - 0.5) / 255.0;

  gl_FragColor = vec4(col, 1.0);
}
`;

type Anchor = [x: number, y: number];

interface Props {
  /** Spectrum centre as fractions of the container (x from left, y from top). */
  anchor?: Anchor;
  /** Centre used when the container is narrower than 768px. */
  anchorNarrow?: Anchor;
  paused?: boolean;
  className?: string;
}

export default function SpectrumField({ anchor = [0.5, 0.5], anchorNarrow, paused = false, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<FieldHandle | null>(null);
  const pausedRef = useRef(paused);
  const [failed, setFailed] = useState(false);

  pausedRef.current = paused;
  // Anchors live in a ref so moving them never rebuilds the GL program.
  const anchorsRef = useRef({ wide: anchor, narrow: anchorNarrow ?? anchor });
  anchorsRef.current = { wide: anchor, narrow: anchorNarrow ?? anchor };
  const [ax, ay] = anchor;
  const [nx, ny] = anchorNarrow ?? anchor;

  useEffect(() => {
    handleRef.current?.redraw();
  }, [ax, ay, nx, ny]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handle = startField(canvas, {
      frag: FRAG,
      still: 2.4, // mid-pulse makes a good still
      isPaused: () => pausedRef.current,
      render: ({ gl, u, cssW, cssH, dpr, time }) => {
        const narrow = cssW < 768;
        const [fx, fy] = narrow ? anchorsRef.current.narrow : anchorsRef.current.wide;
        gl.uniform1f(u('u_time'), time);
        gl.uniform2f(u('u_center'), fx * cssW * dpr, (1 - fy) * cssH * dpr);
        gl.uniform1f(u('u_scale'), Math.min(cssW, cssH) * 0.5 * dpr * (narrow ? 0.95 : 1));
        gl.uniform1f(u('u_dpr'), dpr);
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
    return (
      <div
        aria-hidden="true"
        className={className}
        style={{
          background: `radial-gradient(closest-side at ${ax * 100}% ${ay * 100}%, rgb(var(--c-fg) / 0.2), rgb(var(--c-fg) / 0.06) 28%, rgb(var(--c-fg) / 0.02) 55%, transparent 80%), var(--well)`,
        }}
      />
    );
  }

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}
