/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#F2F6F4",
          100: "#D6E6E0",
          200: "#aee6d2",
          300: "#7ad4b7",
          400: "#46bd99",
          500: "#2E9E6B",
          600: "#0F5B4F",
          700: "#146852",
          800: "#135343",
          900: "#0B2420",
        },
      },
    },
  },
  plugins: [],
};
