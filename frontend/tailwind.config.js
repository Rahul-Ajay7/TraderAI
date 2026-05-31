/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#00B386",
        "primary-dark": "#009973",
        dark: "#0F0F1A",
        card: "#1A1A2E",
        surface: "#16213E",
        muted: "#8892A4",
      },
    },
  },
  plugins: [],
};