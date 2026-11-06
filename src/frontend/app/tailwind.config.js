/** RGB channels from a CSS variable, with Tailwind's opacity modifier support. */
const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Archivo', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"Martian Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      // Every colour resolves to a CSS variable so palettes can be swapped
      // at runtime (see src/theme.ts and the [data-theme] blocks in index.css).
      colors: {
        // 950 = inset well (image viewers, inputs, hero), 900 = page ground,
        // 850 = panel, 800 = raised / hover.
        ink: {
          950: v('well'),
          900: v('ground'),
          850: v('panel'),
          800: v('raised'),
          700: v('ink-700'),
          600: v('ink-600'),
        },
        // Bone: foreground. Text, primary buttons, active states.
        bone: {
          DEFAULT: v('fg'),
          dim: v('fg-dim'),
          mute: v('fg-mute'),
        },
        // Signal: reserved for flagged / synthetic evidence. Not decoration.
        signal: {
          300: v('signal-300'),
          400: v('signal-400'),
          500: v('signal-500'),
          600: v('signal-600'),
        },
        // Real: authentic / passing verdicts.
        real: {
          300: v('real-300'),
          400: v('real-400'),
          500: v('real-500'),
          600: v('real-600'),
        },
        amber: {
          300: v('warn-300'),
          400: v('warn-400'),
          500: v('warn-500'),
        },
        gray: {
          300: v('fg-soft'),
          400: v('fg-dim'),
          500: v('fg-mute'),
          600: v('fg-faint'),
          700: v('ink-600'),
          800: v('ink-700'),
          900: v('well'),
        },
        line: {
          DEFAULT: 'rgb(var(--c-fg) / 0.11)',
          strong: 'rgb(var(--c-fg) / 0.22)',
        },
        // Legacy aliases still referenced by older components.
        background: v('ground'),
        surface: { DEFAULT: v('panel'), light: v('raised'), dark: v('well') },
        primary: { DEFAULT: v('fg'), light: v('fg-strong'), dark: v('fg-soft') },
      },
      borderRadius: {
        sm: '2px',
        DEFAULT: '3px',
        md: '3px',
        lg: '4px',
        xl: '6px',
        '2xl': '8px',
        '3xl': '10px',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
