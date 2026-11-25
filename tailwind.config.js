/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        obsidian: "#090A0D",
        surface: "#111318",
        elevated: "#181B22",
        recessed: "#0C0D12",
        hairline: "#222631",
        "hairline-strong": "#313746",
        ink: "#F4F4F6",
        "ink-muted": "#9499A6",
        "ink-subtle": "#5E6473",
        champagne: "#D4B483",
        "champagne-soft": "#E5CFA8",
      },
    },
  },
  plugins: [],
};
