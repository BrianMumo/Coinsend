/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Deep violet base
        dark: {
          900: '#0D0618',
          950: '#08030F',
          800: '#150B28',
          700: '#1E1038',
        },
        // Rich gold primary
        gold: {
          50:  '#FFF9E6',
          100: '#FFF0BF',
          200: '#FFE080',
          300: '#FFD040',
          400: '#F5A623',
          500: '#E8961A',
          600: '#CC7A0E',
          700: '#A65E08',
          800: '#804504',
          900: '#5C3002',
        },
        // Soft lavender
        lavender: {
          50:  '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#B794F4',
          500: '#A78BFA',
          600: '#8B5CF6',
          700: '#7C3AED',
          800: '#6D28D9',
          900: '#5B21B6',
        },
        // Surface / text grays with purple tint
        surface: {
          50:  '#F8F5FF',
          100: '#EDE9F6',
          200: '#D6D0E4',
          300: '#B5AEC5',
          400: '#908AA6',
          500: '#6E6887',
          600: '#524C68',
          700: '#3A3452',
          800: '#231D3A',
          900: '#150F28',
        },
        // Accent emerald for success/money
        accent: {
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
        },
        // Status
        primary: {
          300: '#FFD040',
          400: '#F5A623',
          500: '#E8961A',
          600: '#CC7A0E',
        },
      },
      boxShadow: {
        'glass':       '0 4px 30px rgba(0, 0, 0, 0.3)',
        'glass-lg':    '0 8px 40px rgba(0, 0, 0, 0.4)',
        'glow-sm':     '0 0 15px rgba(245, 166, 35, 0.15)',
        'glow-gold':   '0 0 25px rgba(245, 166, 35, 0.25)',
        'glow-gold-lg':'0 0 40px rgba(245, 166, 35, 0.3)',
        'glow-purple': '0 0 25px rgba(139, 92, 246, 0.2)',
        'glow-green':  '0 0 20px rgba(16, 185, 129, 0.2)',
      },
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%, 100%': { opacity: '0.4' },
          '50%':      { opacity: '0.8' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
        'float':   'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'glow':    'glow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
