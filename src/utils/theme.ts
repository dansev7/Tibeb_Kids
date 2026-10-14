'use client';

export interface ThemeColors {
  primary: string;
  secondary: string;
  lightBg: string;
  accentBg: string;
  borderColor: string;
  buttonGrad: string;
}

const PRESET_THEMES: Record<string, ThemeColors> = {
  blue: {
    primary: '#2563EB',
    secondary: '#60A5FA',
    lightBg: 'from-blue-50 to-indigo-100',
    accentBg: 'bg-blue-500',
    borderColor: 'border-blue-400',
    buttonGrad: 'from-blue-500 to-indigo-600',
  },
  sky: {
    primary: '#0284C7',
    secondary: '#38BDF8',
    lightBg: 'from-sky-50 to-blue-100',
    accentBg: 'bg-sky-500',
    borderColor: 'border-sky-400',
    buttonGrad: 'from-sky-500 to-cyan-600',
  },
  emerald: {
    primary: '#059669',
    secondary: '#34D399',
    lightBg: 'from-emerald-50 to-teal-100',
    accentBg: 'bg-emerald-500',
    borderColor: 'border-emerald-400',
    buttonGrad: 'from-emerald-500 to-teal-600',
  },
  green: {
    primary: '#16A34A',
    secondary: '#4ADE80',
    lightBg: 'from-green-50 to-emerald-100',
    accentBg: 'bg-green-500',
    borderColor: 'border-green-400',
    buttonGrad: 'from-green-500 to-emerald-600',
  },
  amber: {
    primary: '#D97706',
    secondary: '#FBBF24',
    lightBg: 'from-amber-50 to-orange-100',
    accentBg: 'bg-amber-500',
    borderColor: 'border-amber-400',
    buttonGrad: 'from-amber-500 to-orange-600',
  },
  yellow: {
    primary: '#CA8A04',
    secondary: '#FDE047',
    lightBg: 'from-yellow-50 to-amber-100',
    accentBg: 'bg-yellow-500',
    borderColor: 'border-yellow-400',
    buttonGrad: 'from-yellow-500 to-amber-600',
  },
  purple: {
    primary: '#7C3AED',
    secondary: '#A78BFA',
    lightBg: 'from-purple-50 to-fuchsia-100',
    accentBg: 'bg-purple-500',
    borderColor: 'border-purple-400',
    buttonGrad: 'from-purple-500 to-indigo-600',
  },
  pink: {
    primary: '#DB2777',
    secondary: '#F472B6',
    lightBg: 'from-pink-50 to-rose-100',
    accentBg: 'bg-pink-500',
    borderColor: 'border-pink-400',
    buttonGrad: 'from-pink-500 to-rose-600',
  },
  rose: {
    primary: '#E11D48',
    secondary: '#FB7185',
    lightBg: 'from-rose-50 to-pink-100',
    accentBg: 'bg-rose-500',
    borderColor: 'border-rose-400',
    buttonGrad: 'from-rose-500 to-pink-600',
  },
  orange: {
    primary: '#EA580C',
    secondary: '#FB923C',
    lightBg: 'from-orange-50 to-amber-100',
    accentBg: 'bg-orange-500',
    borderColor: 'border-orange-400',
    buttonGrad: 'from-orange-500 to-amber-600',
  },
};

export function getThemeConfig(themeColor?: string): ThemeColors {
  if (!themeColor) {
    return PRESET_THEMES.sky;
  }

  const normalized = themeColor.toLowerCase().trim();
  if (PRESET_THEMES[normalized]) {
    return PRESET_THEMES[normalized];
  }

  // If hex or rgb or unknown name:
  return {
    primary: themeColor,
    secondary: themeColor,
    lightBg: 'from-sky-50 to-indigo-50',
    accentBg: 'bg-indigo-600',
    borderColor: 'border-indigo-400',
    buttonGrad: 'from-indigo-500 to-purple-600',
  };
}
