/**
 * VisionEdge UDS class recipes (https://visionedge-uds.vercel.app), so buttons, inputs and badges
 * look the same on every screen. Colours come from the ve-* tokens in index.css.
 */

const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed whitespace-nowrap';

/** Sizes: md 40px (default in forms), sm 36px (toolbars), xs 32px (in tables/cards). */
export const btnSize = { md: 'h-10 px-4', sm: 'h-9 px-4', xs: 'h-8 px-3 text-[13px]' } as const;

export const ve = {
  /** Main action on a screen: Royal Blue, Deep Navy on hover. */
  btnPrimary: `${btnBase} bg-ve-blue text-white hover:bg-ve-navy disabled:bg-ve-gray-100 disabled:text-ve-gray-400`,
  /** Alternative action: Royal Blue outline. */
  btnSecondary: `${btnBase} bg-white border border-ve-blue text-ve-blue hover:bg-ve-gray-50 disabled:border-ve-gray-200 disabled:text-ve-gray-400`,
  /** Neutral action: grey outline. */
  btnTertiary: `${btnBase} bg-white border border-ve-gray-200 text-ve-gray-900 hover:bg-ve-gray-50 disabled:text-ve-gray-400`,
  /** Low-emphasis action without a border. */
  btnGhost: `${btnBase} text-ve-gray-700 hover:bg-ve-gray-100 hover:text-ve-gray-900 disabled:text-ve-gray-400`,
  /** Destructive action: Gray 900, black on hover (UDS uses no red). */
  btnDestructive: `${btnBase} bg-ve-gray-900 text-white hover:bg-ve-black disabled:bg-ve-gray-100 disabled:text-ve-gray-400`,

  /** 40px input with a Gray 400 border (meets 3:1). */
  input:
    'h-10 w-full rounded-lg border border-ve-gray-400 bg-white px-3 text-sm text-ve-gray-900 placeholder:text-ve-gray-500 transition-colors hover:border-ve-gray-600 focus:border-ve-blue disabled:bg-ve-gray-100 disabled:text-ve-gray-400',
  /** Error state: 2px Deep Navy border. */
  inputError: 'border-2 border-ve-navy',
  label: 'block text-sm font-medium text-ve-gray-900 mb-2',
  helper: 'mt-1.5 text-xs text-ve-gray-600',
  errorText: 'mt-1.5 text-xs font-medium text-ve-navy',

  card: 'bg-white border border-ve-gray-200 rounded-xl',
  overline: 'text-[11px] leading-4 font-medium uppercase tracking-[0.08em] text-ve-gray-500',

  /** Status badges, 24px pills. */
  badgeLive: 'inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-medium bg-ve-cyan/15 text-ve-navy',
  badgeNeutral: 'inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-medium bg-ve-gray-100 text-ve-gray-700',
  badgeInfo: 'inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-medium bg-ve-blue/[0.08] text-ve-blue',
  badgeCritical: 'inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-medium bg-ve-navy text-white',
} as const;
