import { useSyncExternalStore } from 'react';

/**
 * Colour themes.
 *
 * Every colour in the app comes from CSS variables defined per theme in
 * index.css (`[data-theme='…']`). By default the theme follows the system:
 * `paper` normally, `graphite` when the device prefers dark. A choice made in
 * the header menu overrides that and is remembered in this browser.
 *
 * The same default is applied by a small inline script in index.html so the
 * first paint is already in the right theme. Keep the two in sync.
 */
export const THEMES = [
  { id: 'paper', label: 'Paper', ground: '#F0EEE8', accent: '#DE3E0E' },
  { id: 'graphite', label: 'Graphite', ground: '#1F1F1D', accent: '#FF4F1F' },
  { id: 'forest', label: 'Forest', ground: '#111B17', accent: '#FF582A' },
  { id: 'cobalt', label: 'Cobalt', ground: '#1A2CC4', accent: '#FFD428' },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];
/** `auto` follows the system light/dark setting. */
export type ThemePreference = ThemeId | 'auto';

const LIGHT_DEFAULT: ThemeId = 'paper';
const DARK_DEFAULT: ThemeId = 'graphite';
const STORAGE_KEY = 'deeptrace-theme';
const EVENT = 'deeptrace:theme';

const isTheme = (v: unknown): v is ThemeId => THEMES.some((t) => t.id === v);

const darkQuery = () =>
  typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export const systemTheme = (): ThemeId => (darkQuery()?.matches ? DARK_DEFAULT : LIGHT_DEFAULT);

interface ThemeState {
  /** The theme currently on screen. */
  theme: ThemeId;
  /** What the user asked for: a specific theme, or `auto`. */
  preference: ThemePreference;
}

let state: ThemeState = { theme: LIGHT_DEFAULT, preference: 'auto' };

function apply(preference: ThemePreference) {
  const theme = preference === 'auto' ? systemTheme() : preference;
  state = { theme, preference };
  document.documentElement.dataset.theme = theme;
  const ground = THEMES.find((t) => t.id === theme)?.ground;
  if (ground) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', ground);
  window.dispatchEvent(new Event(EVENT));
}

export function setThemePreference(preference: ThemePreference) {
  try {
    if (preference === 'auto') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Storage can be unavailable (private mode); the choice just won't persist.
  }
  apply(preference);
}

/** Call once before first render. `?theme=cobalt` in the URL selects and saves a theme. */
export function initTheme() {
  const fromUrl = new URLSearchParams(window.location.search).get('theme');
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    saved = null;
  }

  if (isTheme(fromUrl)) setThemePreference(fromUrl);
  else apply(isTheme(saved) ? saved : 'auto');

  // While on automatic, follow the system setting live.
  darkQuery()?.addEventListener('change', () => {
    if (state.preference === 'auto') apply('auto');
  });
}

export const getTheme = (): ThemeId => state.theme;

const subscribe = (onChange: () => void) => {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
};
const getState = () => state;

export function useTheme() {
  const { theme, preference } = useSyncExternalStore(subscribe, getState, getState);
  return { theme, preference, setPreference: setThemePreference };
}

/** Notifies when the theme changes. Returns an unsubscribe function. */
export const onThemeChange = subscribe;

type RGB = [number, number, number];

const channel = (style: CSSStyleDeclaration, name: string, fallback: RGB): RGB => {
  const parts = style.getPropertyValue(name).trim().split(/\s+/).map(Number);
  return parts.length === 3 && parts.every((n) => Number.isFinite(n))
    ? [parts[0] / 255, parts[1] / 255, parts[2] / 255]
    : fallback;
};

const luminance = ([r, g, b]: RGB) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Theme colours for the WebGL fields, as 0..1 channels. */
export function readFieldColors() {
  const style = getComputedStyle(document.documentElement);
  const bg = channel(style, '--c-well', [0.894, 0.882, 0.851]);
  const fg = channel(style, '--c-fg', [0.102, 0.102, 0.094]);
  const signal = channel(style, '--c-signal-500', [0.871, 0.243, 0.055]);
  // On a light ground, ink is dark: tones are drawn inverted, like print.
  return { bg, fg, signal, invert: luminance(fg) < luminance(bg) ? 1 : 0 };
}
