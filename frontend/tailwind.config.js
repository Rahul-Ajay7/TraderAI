/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg:     "#0A0C10",   // page background
        panel:  "#11141B",   // cards / sidebar
        inset:  "#0D1016",   // nested blocks inside cards
        line:   "#1E2430",   // default borders
        line2:  "#2B3548",   // hover borders
        ink:    "#E8ECF3",   // primary text
        muted:  "#8B95A7",   // secondary text
        faint:  "#5A6478",   // tertiary text
        accent: "#4C8DFF",   // brand / interactive
        up:     "#2EBD85",   // gains / buy
        down:   "#F6465D",   // losses / sell
        warn:   "#F0B90B",   // hold / neutral signal
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
