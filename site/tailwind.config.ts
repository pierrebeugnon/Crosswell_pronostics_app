import type { Config } from 'tailwindcss'

/**
 * Le thème ne contient AUCUNE couleur littérale : chaque teinte pointe sur une
 * variable CSS définie dans `src/index.css`, aux valeurs des maquettes de
 * `design/` (refonte du 18/09/2026). Une page écrite ailleurs reste ainsi dans
 * la palette.
 *
 * `<alpha-value>` est remplacé par Tailwind : `bg-accent/10` fonctionne donc
 * exactement comme sur une couleur littérale.
 */
const jeton = (nom: string) => `rgb(var(${nom}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: jeton('--c-canvas'),
        sunken: jeton('--c-sunken'),
        well: jeton('--c-well'),
        surface: jeton('--c-surface'),
        raised: jeton('--c-raised'),
        'raised-2': jeton('--c-raised-2'),
        track: jeton('--c-track'),

        ink: jeton('--c-ink'),
        soft: jeton('--c-soft'),
        muted: jeton('--c-muted'),
        faint: jeton('--c-faint'),
        dim: jeton('--c-dim'),

        sep: jeton('--c-sep'),
        line: jeton('--c-line'),
        'line-strong': jeton('--c-line-strong'),
        'line-hover': jeton('--c-line-hover'),

        accent: {
          DEFAULT: jeton('--c-accent'),
          soft: jeton('--c-accent-soft'),
          ink: jeton('--c-accent-ink'),
          hover: jeton('--c-accent-hover'),
          deep: jeton('--c-accent-deep'),
          dim: jeton('--c-accent-dim'),
        },

        win: { DEFAULT: jeton('--c-win'), soft: jeton('--c-win-soft') },
        loss: { DEFAULT: jeton('--c-loss'), soft: jeton('--c-loss-soft') },
        warn: jeton('--c-warn'),
        wait: { DEFAULT: jeton('--c-wait'), soft: jeton('--c-wait-soft') },
        info: { DEFAULT: jeton('--c-info'), soft: jeton('--c-info-soft') },
      },
      /* Montserrat partout, de 400 à 800 : la maquette n'a qu'une police. */
      fontFamily: {
        sans: ['Montserrat', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Montserrat', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      /* Les rayons de la maquette : 14 px pour les champs et éléments de liste
         (`xl`), 18 px (`2xl`), 20 px pour les cartes (`3xl`), 28 px pour les
         grands blocs (`4xl`). Les pilules restent en `rounded-full`. */
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem', '3xl': '1.25rem', '4xl': '1.75rem' },
      backdropBlur: { xs: '4px', '2xl': '28px', '3xl': '40px' },
      /* Surfaces plates : plus d'ombre portée. Le survol d'une carte se lit
         désormais à sa bordure, qui s'éclaircit (`lift`), ou passe au vert pour
         la carte de sélection (`lift-accent`). */
      boxShadow: {
        card: 'none',
        lift: '0 0 0 1px rgb(var(--c-line-hover))',
        'lift-accent': '0 0 0 1px rgb(var(--c-accent))',
        accent: 'none',
      },
      maxWidth: { content: '90rem' },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'pulse-dot': {
          '0%': { boxShadow: '0 0 0 0 rgb(var(--c-win) / 0.5)' },
          '70%': { boxShadow: '0 0 0 6px rgb(var(--c-win) / 0)' },
          '100%': { boxShadow: '0 0 0 0 rgb(var(--c-win) / 0)' },
        },
        respire: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.45', transform: 'scale(0.92)' },
        },
        /* Le « tombé » d'un résultat : la chip qui passe d'« À venir » à son
           verdict se pose sur la page au lieu d'être téléportée. */
        pop: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '60%': { transform: 'scale(1.06)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .4s cubic-bezier(.22,1,.36,1) both',
        shimmer: 'shimmer 1.6s infinite',
        'pulse-dot': 'pulse-dot 2.4s infinite',
        respire: 'respire 1.8s cubic-bezier(.45,0,.55,1) infinite',
        pop: 'pop .3s cubic-bezier(.22,1,.36,1) both',
      },
    },
  },
  plugins: [],
} satisfies Config
