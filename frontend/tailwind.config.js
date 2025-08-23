/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,ts}"],
  theme: {
    extend: {
      colors: {
        'game-bg': '#1a1a2e',
        'game-text': '#16213e',
        'neon-blue': '#0f3460',
        'neon-cyan': '#00d4ff',
      }
    },
  },
  plugins: [],
}