/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ink: '#131f26', gold: { DEFAULT: '#c9a96a', light: '#e3cb9c', dark: '#8a6d3b' }, ivory: '#f8f8f4', mist: '#eceeea' },
      fontFamily: { serif: ['"Playfair Display"', 'Georgia', 'serif'], sans: ['"DM Sans"', 'system-ui', 'sans-serif'] },
      keyframes: { kenburns: { '0%': { transform: 'scale(1)' }, '100%': { transform: 'scale(1.08)' } } },
      animation: { kenburns: 'kenburns 9s ease-out forwards' },
    },
  },
  plugins: [],
};
