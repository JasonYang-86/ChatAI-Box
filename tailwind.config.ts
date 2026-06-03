/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#FF403A',
          hover: '#E83830',
          soft: 'rgba(255, 64, 58, 0.1)',
          glow: 'rgba(255, 64, 58, 0.2)',
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
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#FF403A',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
