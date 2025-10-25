/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: { extend: {} },
  plugins: [],

  theme: {
  extend: {
    colors: {
      brand: {
        50:  '#eef2ff',
        100: '#e0e7ff',
        200: '#c7d2fe',
        300: '#a5b4fc',
        400: '#818cf8',
        500: '#6366f1',   
        600: '#5458d6',
        700: '#4348b6',
        800: '#373b94',
        900: '#2d3078',
      },
    },
    boxShadow: {
      soft: '0 1px 2px rgba(15,23,42,.06), 0 8px 24px rgba(15,23,42,.06)',
    },
    borderRadius: {
      xl2: '1rem',
    },
  }
}

}