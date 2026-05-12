/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'rgba(10, 10, 15, 0.65)',
        surface: 'rgba(20, 20, 30, 0.45)',
        accent: '#3b82f6', // EZZO Blue
      },
    },
  },
  plugins: [],
}
