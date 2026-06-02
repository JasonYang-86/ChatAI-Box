/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#6C5CE7',
          hover: '#7C6EF7',
          soft: 'rgba(108, 92, 231, 0.15)',
          glow: 'rgba(108, 92, 231, 0.25)',
        },
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
          elevated: 'var(--bg-elevated)',
          glass: 'var(--bg-glass)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        bubble: {
          user: 'var(--user-bubble)',
          ai: 'var(--ai-bubble)',
        },
        border: 'var(--border)',
        'border-light': 'var(--border-light)',
        success: '#00D4AA',
        warning: '#F7B731',
        error: '#FC5C65',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
