import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import SpectrumField from '../components/SpectrumField';
import ScanField from '../components/ScanField';

/* ─── Small deterministic helpers for the illustrations ─── */

const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const GRID_W = 12;
const GRID_H = 10;

/** A zoomed-in pixel crop. With `heat`, the regions the spatial stream reacted to are overlaid. */
function PixelCrop({ heat = false, label }: { heat?: boolean; label: string }) {
  const cells = [];
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const tone = 0.2 + 0.42 * (0.5 + 0.5 * Math.sin(x * 0.62 + 0.8) * Math.cos(y * 0.71 - 0.4)) + hash(x, y) * 0.12;
      const hot =
        Math.exp(-((x - 7.6) ** 2 + (y - 3.2) ** 2) / 5.5) + 0.7 * Math.exp(-((x - 3) ** 2 + (y - 7.4) ** 2) / 3);
      cells.push(
        <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} style={{ fill: `rgb(var(--c-fg) / ${tone.toFixed(3)})` }} />,
      );
      if (heat && hot > 0.18) {
        cells.push(
          <rect key={`h${x}-${y}`} x={x} y={y} width={1.02} height={1.02} style={{ fill: `rgb(var(--c-signal-500) / ${Math.min(0.92, hot).toFixed(3)})` }} />,
        );
      }
    }
  }
  return (
    <svg viewBox={`0 0 ${GRID_W} ${GRID_H}`} role="img" aria-label={label} preserveAspectRatio="none" className="block w-full h-full" shapeRendering="crispEdges">
      {cells}
    </svg>
  );
}

/** A still spectrum: centre energy, axis streaks and the periodic lattice. */
function SpectrumStill({ label }: { label: string }) {
  const peaks = [];
  for (let j = -2; j <= 2; j++) {
    for (let i = -3; i <= 3; i++) {
      if (i === 0 && j === 0) continue;
      const onAxis = i === 0 || j === 0 || Math.abs(i) === Math.abs(j);
      const r = Math.hypot(i, j);
      const a = Math.exp(-r * 0.45) * (onAxis ? 1 : 0.4);
      peaks.push(<circle key={`${i}-${j}`} cx={60 + i * 15} cy={50 + j * 15} r={onAxis ? 1.7 : 1.1} style={{ fill: 'var(--signal)' }} opacity={Math.min(1, a * 1.5)} />);
    }
  }
  return (
    <svg viewBox="0 0 120 100" role="img" aria-label={label} preserveAspectRatio="xMidYMid slice" className="block w-full h-full">
      <defs>
        <radialGradient id="spec-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style={{ stopColor: 'var(--bone)' }} stopOpacity="0.85" />
          <stop offset="12%" style={{ stopColor: 'var(--bone)' }} stopOpacity="0.32" />
          <stop offset="40%" style={{ stopColor: 'var(--bone)' }} stopOpacity="0.08" />
          <stop offset="100%" style={{ stopColor: 'var(--bone)' }} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="100" style={{ fill: 'var(--well)' }} />
      <circle cx="60" cy="50" r="48" fill="url(#spec-core)" />
      <line x1="0" y1="50" x2="120" y2="50" style={{ stroke: 'var(--bone)' }} strokeOpacity="0.16" strokeWidth="0.6" />
      <line x1="60" y1="0" x2="60" y2="100" style={{ stroke: 'var(--bone)' }} strokeOpacity="0.16" strokeWidth="0.6" />
      {peaks}
    </svg>
  );
}

/* Sample per-frame scores for the video illustration (16 frames, as the backend samples). */
const FRAME_SCORES = [12, 15, 11, 18, 22, 19, 34, 61, 88, 93, 71, 42, 24, 17, 14, 13];

function FrameTimeline() {
  return (
    <figure className="m-0">
      <div className="well relative overflow-hidden px-4 pt-5 pb-3 sm:px-6">
        <div className="relative h-44 sm:h-52">
          {/* 50% decision threshold */}
          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-line-strong" />
          <span className="absolute right-0 top-1/2 -translate-y-[calc(100%+4px)] text-xs text-bone-mute">Threshold 50%</span>
          <div className="absolute inset-0 flex items-end gap-[3px] sm:gap-1.5">
            {FRAME_SCORES.map((s, i) => (
              <div key={i} className="flex-1 h-full flex items-end">
                <div
                  className={s >= 50 ? 'w-full bg-signal-500' : 'w-full bg-bone/25'}
                  style={{ height: `${s}%` }}
                />
              </div>
            ))}
          </div>
          {/* Scan cursor */}
          <div className="scan-cursor absolute inset-y-0 left-0 w-full pointer-events-none" style={{ animation: 'sweep 6s cubic-bezier(0.65,0,0.35,1) infinite alternate' }}>
            <div className="h-full w-px bg-bone/60" />
          </div>
        </div>
        <div className="mt-3 flex justify-between num text-[11px] text-bone-mute">
          <span>0:00.0</span>
          <span>0:04.2</span>
          <span>0:08.0</span>
        </div>
      </div>
      <figcaption className="mt-3 text-sm text-bone-mute">
        Sample timeline. Each bar is one sampled frame; frames 8 to 11 score above the threshold.
      </figcaption>
    </figure>
  );
}

/* Hero background variants. `?hero=spectrum` or `?hero=scan` picks one directly. */
type HeroVariant = 'scan' | 'spectrum';

const HERO_COPY: Record<HeroVariant, { caption: string; legend: [string, string] }> = {
  scan: {
    caption: 'A face being analyzed, drawn the way the model reads it: as pixels.',
    legend: ['Dots: the image', 'Highlighted: signs of manipulation'],
  },
  spectrum: {
    caption: 'What the frequency stream sees: the spectrum of an upsampled image.',
    legend: ['Centre: natural image content', 'Repeating peaks: the trace'],
  },
};

const initialVariant = (): HeroVariant =>
  new URLSearchParams(window.location.search).get('hero') === 'spectrum' ? 'spectrum' : 'scan';

const CAPABILITIES: { term: string; detail: string }[] = [
  {
    term: 'Two-stream model',
    detail: 'A spatial CNN and a frequency-domain network score every image independently. An ensemble combines the two into one verdict.',
  },
  {
    term: 'Evidence you can see',
    detail: 'Grad-CAM heatmaps and frequency spectrum maps show which regions and which frequencies drove the result.',
  },
  {
    term: 'Sub-second on CPU',
    detail: 'Inference is built to finish inside a second per image on a standard CPU. Every report includes the timing.',
  },
  {
    term: 'History and analytics',
    detail: 'Every analysis is saved to your account. Admins get usage, verdict and confidence trends across the platform.',
  },
  {
    term: 'Access control',
    detail: 'Token-based sessions, role-based permissions, rate limiting, and an audit log of administrative actions.',
  },
  {
    term: 'Versioned results',
    detail: 'Each report records the model version, the score from each stream and any warnings, so results stay comparable.',
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuthStore();
  const [variant, setVariant] = useState<HeroVariant>(initialVariant);
  const heroCopy = HERO_COPY[variant];

  // On narrow screens the field sits in a reserved gap between the copy and
  // the legend. Its centre is measured so it never lands behind text.
  const heroRef = useRef<HTMLElement>(null);
  const gapRef = useRef<HTMLDivElement>(null);
  const [gap, setGap] = useState({ top: 0.6, mid: 0.74, h: 0.3 });

  useEffect(() => {
    const hero = heroRef.current;
    const gapEl = gapRef.current;
    if (!hero || !gapEl) return;
    const measure = () => {
      const h = hero.getBoundingClientRect();
      const g = gapEl.getBoundingClientRect();
      if (h.height === 0 || g.height === 0) return;
      setGap({
        top: (g.top - h.top) / h.height,
        mid: (g.top + g.height / 2 - h.top) / h.height,
        h: g.height / h.height,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(hero);
    return () => ro.disconnect();
  }, []);

  const primaryTo = isAuthenticated ? '/analyze' : '/signup';

  return (
    <div>
      {/* ─── Hero: the detector's view ─────────────────────── */}
      <section ref={heroRef} className="relative isolate overflow-hidden bg-ink-950 min-h-[100svh] flex flex-col">
        <div className="absolute inset-0 -z-10">
          {variant === 'scan' ? (
            <ScanField
              key="scan"
              frame={{ x: 0.755, y: 0.47, h: 0.68 }}
              frameNarrow={{ x: 0.5, y: gap.mid, h: gap.h * 0.8 }}
              className="fade absolute inset-0 w-full h-full"
            />
          ) : (
            <>
              <SpectrumField
                key="spectrum"
                anchor={[0.7, 0.47]}
                anchorNarrow={[0.5, gap.mid]}
                className="fade absolute inset-0 w-full h-full"
              />
              {/* Keeps the copy readable over the field. */}
              <div
                className="absolute inset-0 hidden md:block"
                style={{
                  background:
                    'linear-gradient(90deg, rgb(var(--c-well)) 0%, rgb(var(--c-well) / 0.92) 26%, rgb(var(--c-well) / 0.35) 52%, rgb(var(--c-well) / 0) 70%)',
                }}
              />
              <div
                className="absolute inset-0 md:hidden"
                style={{
                  background: `linear-gradient(180deg, rgb(var(--c-well)) 0%, rgb(var(--c-well) / 0.94) ${(gap.top * 100 - 6).toFixed(1)}%, rgb(var(--c-well) / 0) ${(gap.top * 100 + 5).toFixed(1)}%)`,
                }}
              />
              <div className="absolute inset-x-0 bottom-0 h-40 md:h-32 bg-gradient-to-t from-ink-950 via-ink-950/80 md:via-transparent to-transparent" />
            </>
          )}
        </div>

        <div className="md:flex-1 flex items-start md:items-center">
          <div className="w-full max-w-7xl mx-auto px-5 sm:px-8 pt-[calc(var(--nav-h)+2.5rem)] md:pt-[calc(var(--nav-h)+3rem)] pb-10 md:pb-14">
            <div className="max-w-[40rem]">
              <h1 className="display text-bone text-[clamp(2.6rem,6.3vw,5.75rem)]">
                <span className="block">Every fake</span>
                <span className="block">leaves a</span>
                <span className="block">trace.</span>
              </h1>
              <p className="mt-6 md:mt-8 max-w-[34rem] text-lg md:text-xl leading-relaxed text-bone-dim">
                DeepTrace examines images and video in two domains at once: the pixels you can see and the
                frequency spectrum you can't. You get a verdict, a confidence score, and a map of where the
                evidence is.
              </p>
              <div className="mt-8 md:mt-10 flex flex-wrap items-center gap-3">
                <Link to={primaryTo} className="btn-primary">
                  Analyze an image
                </Link>
                {isAuthenticated ? (
                  <Link to="/dashboard" className="btn-secondary">Open dashboard</Link>
                ) : (
                  <Link to="/login" className="btn-secondary">Sign in</Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reserved space for the field on narrow screens. */}
        <div ref={gapRef} aria-hidden="true" className="md:hidden flex-1 min-h-[42svh]" />

        {/* Legend: says what the background is. */}
        <div className="w-full max-w-7xl mx-auto px-5 sm:px-8 pb-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between border-t border-line pt-4">
            <div className="text-sm text-bone-mute max-w-xl">
              <p className="text-bone-dim">{heroCopy.caption}</p>
              <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-bone" /> {heroCopy.legend[0]}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-signal-500" /> {heroCopy.legend[1]}
                </li>
              </ul>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {/* Trial control for comparing the two animations. Remove once one is chosen. */}
              <div className="seg" role="group" aria-label="Background animation">
                {(['scan', 'spectrum'] as HeroVariant[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVariant(v)}
                    aria-pressed={variant === v}
                    className={`seg-item ${variant === v ? 'is-active' : ''}`}
                  >
                    {v === 'scan' ? 'Face scan' : 'Spectrum'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Method ───────────────────────────────────────── */}
      <section className="px-5 sm:px-8 pt-24 md:pt-36 pb-20 md:pb-28">
        <div className="max-w-7xl mx-auto">
          <div className="grid gap-6 md:grid-cols-12 md:gap-8 md:items-end">
            <h2 className="display md:col-span-6 text-[clamp(2rem,4vw,3.25rem)] text-bone">
              Two streams, one verdict.
            </h2>
            <p className="md:col-span-5 md:col-start-8 text-lg text-bone-dim leading-relaxed">
              A generated image can look flawless and still be wrong in ways a person can't see. So the model
              reads every image twice, and shows its work both times.
            </p>
          </div>

          {/* Pipeline: input → two streams → report */}
          <div className="mt-14 md:mt-20 grid gap-4 lg:gap-0 lg:grid-cols-[minmax(0,0.85fr)_56px_minmax(0,1.7fr)_56px_minmax(0,1.05fr)] lg:items-stretch">
            {/* Input */}
            <div className="panel p-5 flex flex-col">
              <p className="label">Input</p>
              <div className="well mt-4 overflow-hidden aspect-[6/5]">
                <PixelCrop label="A zoomed-in crop of image pixels" />
              </div>
              <p className="mt-4 text-sm text-bone-dim">
                One image. JPG, PNG or WebP, up to 10&nbsp;MB.
              </p>
            </div>

            <Connector kind="fork" />

            {/* Streams */}
            <div className="grid gap-4">
              <div className="panel p-5 grid grid-cols-[minmax(0,1fr)_7.5rem] sm:grid-cols-[minmax(0,1fr)_10rem] gap-5 items-center">
                <div>
                  <p className="label">Spatial stream</p>
                  <h3 className="heading mt-2 text-xl text-bone">Reads the pixels</h3>
                  <p className="mt-2 text-sm text-bone-dim leading-relaxed">
                    A CNN looks for texture, edge and blending patterns that cameras don't produce. Grad-CAM
                    marks the regions it reacted to.
                  </p>
                </div>
                <div className="well overflow-hidden aspect-[6/5]">
                  <PixelCrop heat label="The same crop with flagged regions highlighted" />
                </div>
              </div>
              <div className="panel p-5 grid grid-cols-[minmax(0,1fr)_7.5rem] sm:grid-cols-[minmax(0,1fr)_10rem] gap-5 items-center">
                <div>
                  <p className="label">Frequency stream</p>
                  <h3 className="heading mt-2 text-xl text-bone">Reads the spectrum</h3>
                  <p className="mt-2 text-sm text-bone-dim leading-relaxed">
                    A Fourier transform turns the image into frequencies. Upsampling inside a generator
                    leaves a repeating grid of peaks there.
                  </p>
                </div>
                <div className="well overflow-hidden aspect-[6/5]">
                  <SpectrumStill label="A frequency spectrum with a repeating grid of peaks" />
                </div>
              </div>
            </div>

            <Connector kind="join" />

            {/* Report */}
            <div className="panel p-5 flex flex-col">
              <p className="label">Sample report</p>
              <div className="mt-4">
                <span className="tag tag-flag">
                  <span className="w-1.5 h-1.5 rounded-full bg-signal-500" /> AI-generated
                </span>
              </div>
              <div className="mt-4 num text-[2.75rem] leading-none text-bone">
                97.2<span className="text-bone-mute text-2xl">%</span>
              </div>
              <p className="mt-1 text-sm text-bone-mute">Confidence</p>
              <dl className="mt-auto pt-6 text-sm">
                {[
                  ['Spatial stream', '96.1%'],
                  ['Frequency stream', '98.4%'],
                  ['Inference time', '412 ms'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-4 py-2.5 border-t border-line">
                    <dt className="text-bone-dim">{k}</dt>
                    <dd className="num text-bone">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* ─── What you get ─────────────────────────────────── */}
      <section className="px-5 sm:px-8 py-20 md:py-28 border-t border-line">
        <div className="max-w-7xl mx-auto grid gap-10 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-4">
            <h2 className="display text-[clamp(1.75rem,3vw,2.5rem)] text-bone md:sticky md:top-24">
              Built to be checked.
            </h2>
          </div>
          <dl className="md:col-span-8">
            {CAPABILITIES.map(({ term, detail }, i) => (
              <div
                key={term}
                className={`grid gap-2 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-8 py-6 ${i === 0 ? 'border-t-0 pt-0' : 'border-t border-line'}`}
              >
                <dt className="heading text-lg text-bone">{term}</dt>
                <dd className="text-bone-dim leading-relaxed max-w-[60ch]">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ─── Video ────────────────────────────────────────── */}
      <section className="px-5 sm:px-8 py-20 md:py-28 border-t border-line">
        <div className="max-w-7xl mx-auto grid gap-12 md:grid-cols-12 md:gap-8 md:items-center">
          <div className="md:col-span-5">
            <h2 className="display text-[clamp(2rem,4vw,3.25rem)] text-bone">Video, frame by&nbsp;frame.</h2>
            <p className="mt-6 text-lg text-bone-dim leading-relaxed">
              DeepTrace samples frames across a clip, finds the face in each one, and scores it with the same
              two streams. Then it checks what a single frame can't show.
            </p>
            <dl className="mt-8 text-sm">
              {[
                ['Face flicker', 'The face changes more than the rest of the frame.'],
                ['Box jitter', 'Face size and position are unstable between frames.'],
                ['Sharpness variance', 'Facial detail comes and goes over time.'],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[9.5rem_minmax(0,1fr)] gap-4 py-3 border-t border-line">
                  <dt className="text-bone">{k}</dt>
                  <dd className="text-bone-dim">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="md:col-span-6 md:col-start-7">
            <FrameTimeline />
          </div>
        </div>
      </section>

      {/* ─── Close ────────────────────────────────────────── */}
      <section className="px-5 sm:px-8 py-24 md:py-36 border-t border-line bg-ink-950">
        <div className="max-w-7xl mx-auto grid gap-8 md:grid-cols-12 md:items-end">
          <h2 className="display md:col-span-7 text-[clamp(2.4rem,5.4vw,4.75rem)] text-bone">
            Check an image.
          </h2>
          <div className="md:col-span-4 md:col-start-9">
            <p className="text-bone-dim leading-relaxed">
              Create an account and run your first analysis. Images up to 10&nbsp;MB, video up to 100&nbsp;MB.
            </p>
            <div className="mt-6">
              <Link to={primaryTo} className="btn-primary">
                {isAuthenticated ? 'Analyze an image' : 'Create account'}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/** Line work between pipeline stages. Hidden on small screens, where the panels simply stack. */
function Connector({ kind }: { kind: 'fork' | 'join' }) {
  const d =
    kind === 'fork'
      ? 'M0 50 H28 M28 25 V75 M28 25 H56 M28 75 H56'
      : 'M0 25 H28 M0 75 H28 M28 25 V75 M28 50 H56';
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 56 100"
      preserveAspectRatio="none"
      className="hidden lg:block w-full h-full text-bone-mute"
    >
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
