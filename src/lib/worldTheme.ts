/**
 * Central world visuals registry — the single source of truth for how each
 * world looks across every screen (home map, world map, play, celebration).
 * Add a new world here and every page picks it up automatically.
 */

export type WorldLanguage = 'en' | 'am';

export interface WorldThemeStyle {
  activeBtn: string;
  completedBtn: string;
  lockedBtn: string;
  glowRing: string;
  pillBorder: string;
}

export interface WorldVisual {
  /** Gradient for the world card on the home map. */
  cardGradient: string;
  /** Border for the world card on the home map. */
  cardBorder: string;
  /** Full-page background gradient for the world map screen. */
  pageGradient: string;
  /** Level-node button styles for the world map screen. */
  theme: WorldThemeStyle;
  /** Primary language used for labels in this world. */
  language: WorldLanguage;
}

export const MASCOT_EMOJIS: Record<string, string> = {
  bird: '🐦',
  cow: '🐄',
  lion: '🦁',
  sheep: '🐑',
};

const DEFAULT_VISUAL: WorldVisual = {
  cardGradient: 'from-blue-400 to-blue-500',
  cardBorder: 'border-blue-300',
  pageGradient: 'from-sky-200 to-sky-100',
  theme: {
    activeBtn: 'bg-sky-500 border-sky-600 text-white shadow-sky-400/50',
    completedBtn: 'bg-sky-600 border-sky-700 text-white shadow-sky-300/40',
    lockedBtn: 'bg-slate-200 border-slate-300 text-slate-400',
    glowRing: 'ring-4 ring-sky-400 ring-offset-4 ring-offset-sky-100',
    pillBorder: 'border-sky-300',
  },
  language: 'en',
};

export const WORLD_VISUALS: Record<string, WorldVisual> = {
  'abc-garden': {
    cardGradient: 'from-emerald-400 to-green-500',
    cardBorder: 'border-emerald-300',
    pageGradient: 'from-emerald-200 via-green-100 to-sky-100',
    theme: {
      activeBtn: 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-400/50',
      completedBtn: 'bg-emerald-600 border-emerald-700 text-white shadow-emerald-300/40',
      lockedBtn: 'bg-slate-200 border-slate-300 text-slate-400',
      glowRing: 'ring-4 ring-emerald-400 ring-offset-4 ring-offset-green-100',
      pillBorder: 'border-emerald-300',
    },
    language: 'en',
  },
  'number-farm': {
    cardGradient: 'from-amber-400 to-orange-500',
    cardBorder: 'border-amber-300',
    pageGradient: 'from-amber-200 via-orange-100 to-sky-100',
    theme: {
      activeBtn: 'bg-amber-500 border-amber-600 text-white shadow-amber-400/50',
      completedBtn: 'bg-amber-600 border-amber-700 text-white shadow-amber-300/40',
      lockedBtn: 'bg-slate-200 border-slate-300 text-slate-400',
      glowRing: 'ring-4 ring-amber-400 ring-offset-4 ring-offset-amber-100',
      pillBorder: 'border-amber-300',
    },
    language: 'en',
  },
  'fidel-village': {
    cardGradient: 'from-purple-400 to-violet-500',
    cardBorder: 'border-purple-300',
    pageGradient: 'from-purple-200 via-violet-100 to-sky-100',
    theme: {
      activeBtn: 'bg-purple-500 border-purple-600 text-white shadow-purple-400/50',
      completedBtn: 'bg-purple-600 border-purple-700 text-white shadow-purple-300/40',
      lockedBtn: 'bg-slate-200 border-slate-300 text-slate-400',
      glowRing: 'ring-4 ring-purple-400 ring-offset-4 ring-offset-purple-100',
      pillBorder: 'border-purple-300',
    },
    language: 'am',
  },
};

export function getWorldVisuals(slug?: string | null): WorldVisual {
  return (slug && WORLD_VISUALS[slug]) || DEFAULT_VISUAL;
}

export function isAmharicWorld(slug?: string | null): boolean {
  return getWorldVisuals(slug).language === 'am';
}

export function mascotEmoji(mascot?: string | null): string {
  return (mascot && MASCOT_EMOJIS[mascot]) || '⭐';
}
