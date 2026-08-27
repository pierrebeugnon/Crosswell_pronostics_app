import type { Config } from 'tailwindcss'

/**
 * Le thème ne contient AUCUNE couleur littérale : chaque teinte pointe sur une
 * variable CSS définie dans `src/index.css`. Une page écrite ailleurs reste
 * ainsi dans la palette, et la matière du verre se règle en un seul endroit.
 *
 * `<alpha-value>` est remplacé par Tailwind : `bg-accent/15` fonctionne donc
 * exactement comme sur une couleur littérale — ce qui est vital ici, puisque
 * presque toute l'interface est composée en transparence.
 */
const jeton = (nom: string) => `rgb(var(${nom}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: jeton('--c-canvas'),
        surface: jeton('--c-surface'),
        raised: jeton('--c-raised'),

        ink: jeton('--c-ink'),
        muted: jeton('--c-muted'),
        faint: jeton('--c-faint'),

        line: jeton('--c-line'),
        'line-strong': jeton('--c-line-strong'),

        accent: {
          DEFAULT: jeton('--c-accent'),
          soft: jeton('--c-accent-soft'),
          ink: jeton('--c-accent-ink'),
        },

        win: { DEFAULT: jeton('--c-win'), soft: jeton('--c-win-soft') },
        loss: { DEFAULT: jeton('--c-loss'), soft: jeton('--c-loss-soft') },
        wait: { DEFAULT: jeton('--c-wait'), soft: jeton('--c-wait-soft') },
        info: { DEFAULT: jeton('--c-info'), soft: jeton('--c-info-soft') },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Montserrat', 'Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      /* Des rayons larges : le verre se lit mal sur un angle serré, où la
         bordure claire se casse au lieu de filer. */
      borderRadius: { xl: '1rem', '2xl': '1.25rem', '3xl': '1.625rem', '4xl': '2rem' },
      backdropBlur: { xs: '4px', '2xl': '28px', '3xl': '40px' },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.3), 0 16px 40px -20px rgb(0 0 0 / 0.7)',
        /* `lift` PORTE le filet de verre. Un `hover:shadow-lift` remplace tout
           le box-shadow de la carte : sans l'inset, l'arête lumineuse — ce qui
           fait lire la surface comme du verre — s'éteignait au survol, au
           moment précis où la carte s'élève. `lift-accent` est le pendant pour
           la carte de sélection : il conserve sa lueur verte en l'élevant. */
        lift: 'inset 0 1px 0 0 rgb(255 255 255 / 0.12), 0 2px 6px rgb(0 0 0 / 0.35), 0 28px 60px -24px rgb(0 0 0 / 0.9)',
        'lift-accent':
          'inset 0 1px 0 0 rgb(255 255 255 / 0.14), 0 2px 6px rgb(0 0 0 / 0.35), 0 26px 56px -22px rgb(var(--c-accent) / 0.4)',
        accent: '0 0 40px -10px rgb(var(--c-accent) / 0.5)',
      },
      maxWidth: { content: '76rem' },
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
        /* La dérive des halos du fond vit dans index.css (`derive-halos`) :
           Tailwind ne peut pas cibler body::before. */
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
