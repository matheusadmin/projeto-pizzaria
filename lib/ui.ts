// Tokens de estilo compartilhados (classes Tailwind).
// Fontes carregadas em app/layout.tsx via next/font.
export const DISPLAY = 'font-[family-name:var(--font-display)]'

/** Campo de formulário padrão do sistema (Dark Mode). */
export const INPUT =
  'w-full rounded-md border border-white/15 bg-fundo px-3 py-2 text-sm text-white ' +
  'placeholder:text-slate-500 focus:border-marca focus:outline-none focus:ring-2 focus:ring-marca/60'

/** Alias mantido por compatibilidade com o PDV. */
export const INPUT_DARK = INPUT
