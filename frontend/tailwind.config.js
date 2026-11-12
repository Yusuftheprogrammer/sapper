/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#090d16',
        card: '#101726',
        cardBorder: '#1e293b',
        primary: {
          DEFAULT: '#00f2fe',
          foreground: '#04111d'
        },
        status: {
          normal: '#10b981',    // 0: Green
          warning: '#f59e0b',   // 1: Amber/Yellow
          critical: '#ef4444',  // 2: Danger Red
          offline: '#64748b'    // 3: Offline Gray
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-danger': 'glowDanger 1.5s ease-in-out infinite alternate',
      },
      keyframes: {
        glowDanger: {
          '0%': { boxShadow: '0 0 5px rgba(239, 68, 68, 0.4)' },
          '100%': { boxShadow: '0 0 20px rgba(239, 68, 68, 0.9)' },
        }
      }
    },
  },
  plugins: [],
};
