/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* NAFRA Design System Colors */
        nafra: {
          bg: '#0a0f1a',           /* Fondo principal (body) */
          surface: '#0d1926',      /* Superficies secundarias */
          card: '#111b27',         /* Fondo de tarjetas */
          'card-hover': '#162234', /* Tarjeta al hover */
          border: '#1a2a3a',       /* Bordes normales */
          'border-light': '#243447',/* Bordes hover */
          accent: '#297cf2',       /* Color de acento principal (azul) */
          'accent-dim': '#1e5fbd', /* Acento oscuro */
          text: '#e8edf3',         /* Texto principal */
          'text-dim': '#8899aa',   /* Texto secundario */
          'text-muted': '#5a6a7a', /* Texto terciario */
          sidebar: '#080d16',      /* Fondo sidebar */
          danger: '#e85d45',       /* Errores/eliminar */
          warning: '#ffb84d',      /* Advertencias */
          success: '#297cf2',      /* Éxito (azul) */
        },
        /* Legacy colors (compatibility) */
        'alquid-navy': '#0a0f1a',
        'alquid-gray25': '#0a0f1a',
        'alquid-grayDark': '#e8edf3',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
      },
      boxShadow: {
        'glassmorphic': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'premium': '0 4px 6px 0 rgba(0, 0, 0, 0.3)',
      },
      backdropBlur: {
        'glass': 'blur(4px)',
      },
    },
  },
  plugins: [],
}
