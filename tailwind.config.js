/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        fmkCyan: "#00f5d4",
        fmkDark: "#060b19",
        fmkPanel: "#0f172a",
      },
      width: {
        sidebar: "21.25rem",
      },
    },
  },
  plugins: [],
};
