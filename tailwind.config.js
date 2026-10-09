/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ink: '#0b0b0c', gold: { DEFAULT: '#c9a24a', light: '#f8c120', dark: '#9a7623' }, ivory: '#faf8f3' },
      fontFamily: { serif: ['"EB Garamond"', 'Georgia', 'serif'], sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
