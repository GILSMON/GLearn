/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Claude's warm copper/terracotta accent
        brand: {
          50:  '#FFF4EE',
          100: '#FFE3CC',
          200: '#FFC49A',
          300: '#FF9F60',
          400: '#F07840',
          500: '#D4693A',  /* main — Claude warm copper */
          600: '#B85530',
          700: '#9A4425',
          900: '#3D1A0A',
        }
      }
    }
  },
  plugins: [],
}
