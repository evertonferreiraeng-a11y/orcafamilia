import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9ecff',
          200: '#bcdcff',
          300: '#8ec4ff',
          400: '#59a3ff',
          500: '#2a78d6',
          600: '#1f5eb0',
          700: '#1c4a8c',
          800: '#1c3f73',
          900: '#1c3660',
        },
        positive: '#16a34a',
        negative: '#dc2626',
        surface: '#f7f8fa',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(16 24 40 / 0.05)',
        card: '0 1px 3px 0 rgb(16 24 40 / 0.06), 0 1px 2px -1px rgb(16 24 40 / 0.06)',
        elevated: '0 4px 6px -2px rgb(16 24 40 / 0.05), 0 12px 16px -4px rgb(16 24 40 / 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
