/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        coffee: {
          50: '#fdf8f6',
          100: '#f2e8e5',
          200: '#eaddd7',
          300: '#e0aea0',
          400: '#d38b77',
          500: '#c06b52',
          600: '#a75037',
          700: '#8c3f2b',
          800: '#6f3325',
          900: '#431f18',
          950: '#2b120d',
        },
        warm: {
          50: '#faf8f5',
          100: '#f5f0e8',
          200: '#eae0d0',
          800: '#3a322d',
          900: '#26201c'
        }
      }
    },
  },
  plugins: [],
}
