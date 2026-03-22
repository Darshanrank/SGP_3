/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
      }
    },
  },
  plugins: [
    function({ addComponents, theme }) {
      addComponents({
        // Success semantic colors (muted green)
        '.success-badge': {
          '@apply bg-green-500/10 text-green-400 border border-green-500/30 rounded-full px-3 py-1': {},
        },
        '.success-subtle': {
          '@apply bg-green-500/10 text-green-400': {},
        },
        '.success-outline-button': {
          '@apply bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20': {},
        },
        // Danger semantic colors (muted red)
        '.danger-badge': {
          '@apply bg-red-500/10 text-red-400 border border-red-500/30 rounded-full px-3 py-1': {},
        },
        '.danger-subtle': {
          '@apply bg-red-500/10 text-red-400': {},
        },
        '.danger-outline-button': {
          '@apply bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20': {},
        },
        // Status badge styles
        '.status-pending': {
          '@apply bg-amber-500/20 text-amber-400 border-amber-500/35': {},
        },
        '.status-accepted': {
          '@apply bg-green-500/10 text-green-400 border-green-500/30': {},
        },
        '.status-rejected': {
          '@apply bg-red-500/10 text-red-400 border-red-500/30': {},
        },
        '.status-cancelled': {
          '@apply bg-gray-500/15 text-gray-400 border-gray-500/30': {},
        },
      });
    }
  ],
}
