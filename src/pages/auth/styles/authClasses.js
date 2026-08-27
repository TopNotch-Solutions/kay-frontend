/**
 * Auth pages — centered login card over cycling blurred backgrounds.
 */

export const auth = {
  shell: 'relative flex min-h-screen min-h-[100dvh] flex-col overflow-hidden',
  main: 'relative z-10 flex min-h-0 flex-1 flex-col',

  /** Full-viewport photo stack behind the card */
  bgLayer: 'absolute inset-0 bg-cover bg-center transition-opacity duration-[1400ms] ease-in-out',
  bgScrim: 'absolute inset-0 bg-slate-900/20',

  /** Centered form stage */
  stage: 'relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:px-6',
  card:
    'w-full max-w-[420px] rounded-2xl border border-white/60 bg-[#F8F9FA]/95 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.28)] backdrop-blur-md sm:p-10',
  cardTitle: 'text-center text-[1.75rem] font-bold tracking-tight text-slate-900 sm:text-[2rem]',
  cardSubtitle: 'mx-auto mt-2 max-w-[20rem] text-center text-sm leading-relaxed text-slate-500',

  form: 'mt-8 space-y-5',
  field: 'space-y-1.5',
  label: 'block text-sm font-semibold text-slate-800',
  input:
    'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[0.95rem] text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20',
  passwordWrap: 'relative',
  passwordToggle:
    'absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700',

  row: 'flex items-center justify-between gap-3',
  remember:
    'inline-flex cursor-pointer items-center gap-2 text-sm text-slate-500 select-none',
  checkbox:
    'h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600/30',
  link: 'text-sm font-semibold text-teal-700 transition hover:text-teal-800 hover:underline',

  submit:
    'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#00695C] py-3 text-sm font-semibold text-white shadow-md shadow-teal-900/20 transition hover:bg-[#00574c] focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
  error: 'rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800',

  footer: 'mt-7 text-center text-sm text-slate-500',
  footerLink: 'font-semibold text-teal-700 transition hover:text-teal-800 hover:underline',

  /** Kept for other auth pages that still use the split layout */
  split: 'flex min-h-0 flex-1 flex-col lg:flex-row',
  heroPanel:
    'flex w-full flex-col justify-between bg-gradient-to-br from-slate-900 via-teal-900 to-teal-800 text-white lg:w-[60%] lg:min-h-0',
  heroInner: 'flex flex-1 flex-col justify-center p-8 sm:p-10 lg:p-12',
  heroTitle: 'mt-2 text-3xl font-bold tracking-tight sm:text-4xl',
  heroMeta: 'mt-3 text-sm text-teal-100/90',
  heroLead: 'mt-4 max-w-lg text-sm leading-relaxed text-teal-100/80 sm:text-base',
  heroFooter: 'border-t border-white/10 px-8 py-4 text-xs text-teal-100/70 sm:px-10 lg:px-12',
  formPanel:
    'flex w-full items-center justify-center bg-slate-50 px-4 py-8 sm:px-8 lg:w-[40%] lg:py-12',
  formInner: 'w-full max-w-md',
  coat: 'mx-auto mb-4 h-20 w-20 object-contain',
  devHint:
    'mb-4 rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-center text-xs text-teal-900',
};
