/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        tamu: {
          maroon: '#500000',
          maroonDark: '#3C0000',
          gray: '#F0F0F0',
          grayDark: '#E0E0E0',
          white: '#FFFFFF',
          black: '#000000',
          accent: {
            blue: '#003C71',
            orange: '#F18A3B',
            green: '#507C42',
            yellow: '#FFB81C',
            red: '#BA0C2F',
          },
        },
      },
    },
  },
  plugins: [],
};