/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors');

// RydZo dark theme.
// The pages were written for a light UI (bg-white cards, text-neutral-900 text, bg-amber-50
// notices...). Instead of editing every page, the tokens below remap those classes:
//   - neutral/gray run dark -> light (bg-neutral-50 is a dark panel, text-neutral-900 is near-white)
//   - bg-white is the card surface; text-white stays white
//   - pale tinted backgrounds (bg-*-50/100/200) become translucent glows,
//     and dark tinted text (text-*-600..900) becomes the light shade so it reads on dark.
const rgb = (name) => `rgb(var(--${name}) / <alpha-value>)`;

const neutralDark = {
  50: rgb('n-50'),
  100: rgb('n-100'),
  200: rgb('n-200'),
  300: rgb('n-300'),
  400: rgb('n-400'),
  500: rgb('n-500'),
  600: rgb('n-600'),
  700: rgb('n-700'),
  800: rgb('n-800'),
  900: rgb('n-900'),
  950: rgb('n-950'),
};

const primary = {
  50: '#f0fdf4',
  100: '#dcfce7',
  200: '#bbf7d0',
  300: '#86efac',
  400: '#4ade80',
  500: '#22c55e',
  600: '#16a34a',
  700: '#15803d',
  800: '#166534',
  900: '#14532d',
  950: '#052e16',
};

const accent = {
  50: '#fff7ed',
  100: '#ffedd5',
  200: '#fed7aa',
  300: '#fdba74',
  400: '#fb923c',
  500: '#f97316',
  600: '#ea580c',
  700: '#c2410c',
  800: '#9a3412',
  900: '#7c2d12',
};

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

const tinted = {
  primary, accent,
  green: colors.green, emerald: colors.emerald, red: colors.red, rose: colors.rose,
  amber: colors.amber, yellow: colors.yellow, orange: colors.orange, blue: colors.blue,
  indigo: colors.indigo, purple: colors.purple, sky: colors.sky, cyan: colors.cyan,
};

const tintBackgrounds = {};
const tintText = {};
const tintBorders = {};
for (const [name, scale] of Object.entries(tinted)) {
  const base = hexToRgb(scale[500]);
  tintBackgrounds[name] = {
    50: `rgb(${base} / 0.08)`,
    100: `rgb(${base} / 0.14)`,
    200: `rgb(${base} / 0.22)`,
  };
  tintText[name] = {
    600: scale[400],
    700: scale[300],
    800: scale[200],
    900: scale[100],
  };
  tintBorders[name] = {
    100: `rgb(${base} / 0.18)`,
    200: `rgb(${base} / 0.28)`,
    300: `rgb(${base} / 0.4)`,
  };
}

module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary,
        accent,
        neutral: neutralDark,
        gray: neutralDark,
        ink: rgb('ink'),
      },
      backgroundColor: {
        white: rgb('surface'),
        black: rgb('n-950'),
        ...tintBackgrounds,
      },
      textColor: {
        black: rgb('n-900'),
        ...tintText,
      },
      borderColor: tintBorders,
      gradientColorStops: {
        white: rgb('surface'),
      },
      boxShadow: {
        glow: '0 0 0 1px rgb(34 197 94 / 0.25), 0 10px 40px -10px rgb(34 197 94 / 0.45)',
        card: '0 1px 0 0 rgb(255 255 255 / 0.04) inset, 0 10px 30px -12px rgb(0 0 0 / 0.6)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out both',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
