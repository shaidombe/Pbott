import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f7ff',
          100: '#edf0ff',
          200: '#dde3ff',
          300: '#c1ccff',
          400: '#8b9fff',
          500: '#6b85ff',
          600: '#4d6fff',
          700: '#3355ff',
        },
        accent: {
          50: '#fdf6ff',
          100: '#fbedff',
          200: '#f6ddff',
          300: '#f0c6ff',
          400: '#e5a6ff',
          500: '#d580ff',
          600: '#c65fff',
          700: '#b23fff',
        },
        sunset: {
          50: '#fff5f9',
          100: '#ffe6f0',
          200: '#ffd6e8',
          300: '#ffb8d9',
          400: '#ff8cc5',
          500: '#ff66b3',
          600: '#ff3d9d',
          700: '#ff1a8b',
        },
      },
    },
  },
  plugins: [],
};

export default config;
