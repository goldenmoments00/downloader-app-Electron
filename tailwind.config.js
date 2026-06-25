/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#FFF3D6',
        card: '#FFFFFF',
        primary: '#FFD54A', // Yellow
        secondary: '#FFA726', // Orange
        accent: '#FF7A00', // Deep Orange
        highlight: '#D90429', // Red
        'text-primary': '#3D2B1F',
        'text-secondary': '#8D7B6F',
        border: 'rgba(255,167,38,0.2)'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%) skewX(-20deg)' }
        }
      },
      animation: {
        shimmer: 'shimmer 1s forwards'
      }
    },
  },
  plugins: [],
}
