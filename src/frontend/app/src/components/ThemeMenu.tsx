import { useEffect, useRef, useState } from 'react';
import { Check, Monitor } from 'lucide-react';
import { THEMES, useTheme, type ThemePreference } from '../theme';

/** Half ground, half accent: a swatch of a theme. */
function Swatch({ ground, accent, size = 18 }: { ground: string; accent: string; size?: number }) {
  return (
    <span
      className="block rounded-full border border-line-strong shrink-0"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${ground} 50%, ${accent} 50%)` }}
    />
  );
}

/** Header control for choosing the colour theme. */
export default function ThemeMenu() {
  const { theme, preference, setPreference } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (pref: ThemePreference) => {
    setPreference(pref);
    setOpen(false);
  };

  const item =
    'w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm text-left text-bone-dim hover:text-bone hover:bg-bone/5 transition-colors';

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Colour theme: ${current.label}${preference === 'auto' ? ' (automatic)' : ''}`}
        title="Colour theme"
        className="w-9 h-9 flex items-center justify-center rounded hover:bg-bone/5 transition-colors"
      >
        <Swatch ground={current.ground} accent={current.accent} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Colour theme"
          className="absolute right-0 mt-2 w-56 p-1 rounded-md border border-line-strong bg-ink-850 origin-top-right animate-[menu-in_0.16s_cubic-bezier(0.16,1,0.3,1)]"
          style={{ boxShadow: 'var(--shadow-pop)' }}
        >
          <button
            type="button"
            role="menuitemradio"
            aria-checked={preference === 'auto'}
            onClick={() => choose('auto')}
            className={item}
          >
            <Monitor size={18} className="shrink-0" />
            <span className="flex-1">
              <span className="block text-bone">Automatic</span>
              <span className="block text-xs text-bone-mute">Matches your system</span>
            </span>
            {preference === 'auto' && <Check size={15} className="text-bone shrink-0" />}
          </button>

          <div className="my-1 border-t border-line" />

          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="menuitemradio"
              aria-checked={preference === t.id}
              onClick={() => choose(t.id)}
              className={item}
            >
              <Swatch ground={t.ground} accent={t.accent} />
              <span className="flex-1 text-bone">{t.label}</span>
              {preference === t.id && <Check size={15} className="text-bone shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
