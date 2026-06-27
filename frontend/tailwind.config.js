/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F172A', // Slate 900
          light: '#1E293B',   // Slate 800
          dark: '#020617',    // Slate 950
        },
        accent: {
          DEFAULT: '#2563EB', // Blue 600
          light: '#3B82F6',   // Blue 500
          dark: '#1D4ED8',    // Blue 700
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
      },
      animation: {
        'shimmer': 'shimmer 2s infinite linear',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(249, 115, 22, 0.4)' },
          '70%': { transform: 'scale(1)', boxShadow: '0 0 0 8px rgba(249, 115, 22, 0)' },
          '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(249, 115, 22, 0)' },
        }
      }
    },
  },
  plugins: [],
}
