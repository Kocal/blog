/** @type {import('tailwindcss').Config} */
export default {
  content: ['./posts/**/*.md', '.vitepress/theme/**/*.vue'],
  darkMode: ['class', '.dark'],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1280px',
    },
    container: {
      center: true,
    },
    extend: {
      colors: {
        accent: {
          50: '#f4f8f9',
          100: '#daf1fb',
          200: '#b0e0f6',
          300: '#7ec1e8',
          400: '#499dd5',
          500: '#377cc3',
          600: '#2e61ac',
          700: '#264989',
          800: '#1b3163',
          900: '#101e40',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
