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
        background: '#0D0F12',
        foreground: '#F3F4F6',
        surface: {
          DEFAULT: '#13161C',
          muted: '#181C24',
          subtle: '#1F242E',
          border: '#282E3B',
        },
        brand: {
          gold: {
            50: '#FFFDF5',
            100: '#FEF9E6',
            400: '#FBBF24',
            500: '#F59E0B',
            600: '#D97706',
            glow: 'rgba(245, 158, 11, 0.15)',
          },
          blue: {
            400: '#60A5FA',
            500: '#3B82F6',
            600: '#2563EB',
            glow: 'rgba(59, 130, 246, 0.15)',
          },
        },
        status: {
          recovered: '#10B981',
          recovering: '#F59E0B',
          failed: '#EF4444',
          escalated: '#8B5CF6',
          open: '#3B82F6',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px -5px rgba(245, 158, 11, 0.2)',
        card: '0 4px 20px -2px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
};

export default config;
