import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#151513',
        foreground: '#F2EDE3',
        surface: {
          DEFAULT: '#1C1B18',
          elevated: '#24221E',
          muted: '#181714',
          subtle: '#201F1B',
          border: 'rgba(242, 237, 227, 0.10)',
        },
        primary: {
          DEFAULT: '#F2EDE3',
          foreground: '#151513',
        },
        secondary: {
          DEFAULT: '#B7B0A3',
        },
        muted: {
          DEFAULT: '#817A70',
        },
        accent: {
          brass: '#B89A62',
          'brass-soft': '#D1B982',
          DEFAULT: '#B89A62',
        },
        brand: {
          gold: {
            50: '#FDFBF7',
            100: '#F9F5EC',
            400: '#D1B982',
            500: '#B89A62',
            600: '#9E824F',
            glow: 'rgba(184, 154, 98, 0.15)',
          },
          blue: {
            400: '#8A9EAF',
            500: '#71879A',
            600: '#586E81',
            glow: 'rgba(113, 135, 154, 0.15)',
          },
        },
        status: {
          success: '#6F9B7A',
          warning: '#B68B4F',
          danger: '#B56F68',
          info: '#71879A',
          recovered: '#6F9B7A',
          recovering: '#B68B4F',
          failed: '#B56F68',
          escalated: '#817A70',
          open: '#71879A',
        },
        subtleBorder: 'rgba(242, 237, 227, 0.10)',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '10px',
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(0, 0, 0, 0.25)',
        card: '0 2px 8px rgba(0, 0, 0, 0.20)',
        dropdown: '0 4px 16px rgba(0, 0, 0, 0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
