/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        border: 'var(--color-border)', // slate-200
        input: 'var(--color-input)', // white
        ring: 'var(--color-ring)', // blue-600
        background: 'var(--color-background)', // slate-50
        foreground: 'var(--color-foreground)', // slate-800
        primary: {
          DEFAULT: 'var(--color-primary)', // blue-600
          foreground: 'var(--color-primary-foreground)' // white
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)', // slate-500
          foreground: 'var(--color-secondary-foreground)' // white
        },
        destructive: {
          DEFAULT: 'var(--color-destructive)', // red-600
          foreground: 'var(--color-destructive-foreground)' // white
        },
        muted: {
          DEFAULT: 'var(--color-muted)', // slate-100
          foreground: 'var(--color-muted-foreground)' // slate-500
        },
        accent: {
          DEFAULT: 'var(--color-accent)', // sky-500
          foreground: 'var(--color-accent-foreground)' // white
        },
        popover: {
          DEFAULT: 'var(--color-popover)', // white
          foreground: 'var(--color-popover-foreground)' // slate-800
        },
        card: {
          DEFAULT: 'var(--color-card)', // white
          foreground: 'var(--color-card-foreground)' // slate-800
        },
        success: {
          DEFAULT: 'var(--color-success)', // emerald-600
          foreground: 'var(--color-success-foreground)' // white
        },
        warning: {
          DEFAULT: 'var(--color-warning)', // amber-600
          foreground: 'var(--color-warning-foreground)' // white
        },
        error: {
          DEFAULT: 'var(--color-error)', // red-600
          foreground: 'var(--color-error-foreground)' // white
        },
        surface: 'var(--color-surface)', // white
        'text-primary': 'var(--color-text-primary)', // slate-800
        'text-secondary': 'var(--color-text-secondary)', // slate-500
        sidebar: {
          background: 'var(--color-sidebar-background)', // white
          foreground: 'var(--color-sidebar-foreground)', // slate-800
          border: 'var(--color-sidebar-border)', // slate-200
          hover: 'var(--color-sidebar-hover)', // slate-100
          active: 'var(--color-sidebar-active)', // blue-50
          'active-foreground': 'var(--color-sidebar-active-foreground)' // blue-600
        },
        header: {
          background: 'var(--color-header-background)', // white
          foreground: 'var(--color-header-foreground)', // slate-800
          border: 'var(--color-header-border)' // slate-200
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }]
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '240': '60rem'
      },
      width: {
        // Slightly narrower admin sidebar for more canvas space
        'sidebar': '224px',
        'sidebar-collapsed': '60px'
      },
      height: {
        'header': '64px'
      },
      margin: {
        'sidebar': '224px',
        'sidebar-collapsed': '60px'
      },
      zIndex: {
        'sidebar': '100',
        'header': '200',
        'dropdown': '300',
        'toast': '9999',
        'modal': '1000'
      },
      boxShadow: {
        'sidebar': '0 1px 3px rgba(0, 0, 0, 0.1)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.1)',
        'modal': '0 10px 25px rgba(0, 0, 0, 0.15)'
      },
      transitionDuration: {
        '200': '200ms',
        '300': '300ms'
      },
      transitionTimingFunction: {
        'smooth': 'ease-out',
        'modal': 'ease-in-out'
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms')
  ]
}