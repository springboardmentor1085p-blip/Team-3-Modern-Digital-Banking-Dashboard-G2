/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      /* ===============================
         COLORS
      ================================ */
      colors: {
        /* Primary */
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },

        /* Secondary */
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },

        /* Success */
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },

        /* Warning */
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },

        /* Error / Danger */
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },

        /* Info */
        info: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },

        /* Budget status (Milestone 2) */
        budget: {
          under: '#10b981',
          warning: '#f59e0b',
          near_limit: '#f97316',
          over: '#ef4444',
        },

        /* Reward tiers (Milestone 3) */
        bronze: '#cd7f32',
        silver: '#c0c0c0',
        gold: '#ffd700',
        platinum: '#e5e4e2',
        diamond: '#b9f2ff',

        /* Bill status (Milestone 3) */
        bill: {
          paid: '#10b981',
          pending: '#f59e0b',
          overdue: '#ef4444',
          dueSoon: '#f97316',
        },
      },

      /* ===============================
         FONTS
      ================================ */
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },

      /* ===============================
         ANIMATIONS
      ================================ */
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-slow': 'bounce 2s infinite',
        'shimmer': 'shimmer 2s infinite',
        'float': 'float 6s ease-in-out infinite',
        'notification': 'notification 0.5s ease-out',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%, 100%': { backgroundPosition: '-200px 0' },
          '50%': { backgroundPosition: 'calc(200px + 100%) 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        notification: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },

      /* ===============================
         SHADOWS
      ================================ */
      boxShadow: {
        card:
          '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
        'card-hover':
          '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
        dropdown:
          '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
        glow: '0 0 20px rgba(59,130,246,0.5)',
        'glow-success': '0 0 20px rgba(34,197,94,0.5)',
        'glow-warning': '0 0 20px rgba(245,158,11,0.5)',
        'glow-error': '0 0 20px rgba(239,68,68,0.5)',
        'glow-bronze': '0 0 20px rgba(205,127,50,0.5)',
        'glow-silver': '0 0 20px rgba(192,192,192,0.5)',
        'glow-gold': '0 0 20px rgba(255,215,0,0.5)',
        'glow-diamond': '0 0 20px rgba(185,242,255,0.5)',
      },

      /* ===============================
         BACKGROUNDS
      ================================ */
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-bronze':
          'linear-gradient(135deg, #cd7f32 0%, #a6692a 100%)',
        'gradient-silver':
          'linear-gradient(135deg, #c0c0c0 0%, #a0a0a0 100%)',
        'gradient-gold':
          'linear-gradient(135deg, #ffd700 0%, #cca300 100%)',
        'gradient-platinum':
          'linear-gradient(135deg, #e5e4e2 0%, #c4c2bf 100%)',
        'gradient-diamond':
          'linear-gradient(135deg, #b9f2ff 0%, #7ce0ff 100%)',
      },
    },
  },

  /* ===============================
     PLUGINS
  ================================ */
  plugins: [require('@tailwindcss/forms')],
};
