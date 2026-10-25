export interface BrandColors {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryBorder: string;
  primaryRing: string;
  textPrimary: string;
  textPrimaryDark: string;
  bgLight: string;
  bgDark: string;
}

const PALETTES: Record<string, BrandColors> = {
  indigo: {
    primary: '#6366f1',
    primaryHover: '#4f46e5',
    primaryLight: '#eef2ff',
    primaryBorder: '#c7d2fe',
    primaryRing: 'rgba(99, 102, 241, 0.5)',
    textPrimary: '#4f46e5',
    textPrimaryDark: '#818cf8',
    bgLight: '#e0e7ff',
    bgDark: 'rgba(99, 102, 241, 0.2)',
  },
  blue: {
    primary: '#3b82f6',
    primaryHover: '#2563eb',
    primaryLight: '#eff6ff',
    primaryBorder: '#bfdbfe',
    primaryRing: 'rgba(59, 130, 246, 0.5)',
    textPrimary: '#2563eb',
    textPrimaryDark: '#60a5fa',
    bgLight: '#dbeafe',
    bgDark: 'rgba(59, 130, 246, 0.2)',
  },
  green: {
    primary: '#22c55e',
    primaryHover: '#16a34a',
    primaryLight: '#f0fdf4',
    primaryBorder: '#bbf7d0',
    primaryRing: 'rgba(34, 197, 94, 0.5)',
    textPrimary: '#16a34a',
    textPrimaryDark: '#4ade80',
    bgLight: '#dcfce7',
    bgDark: 'rgba(34, 197, 94, 0.2)',
  },
  red: {
    primary: '#ef4444',
    primaryHover: '#dc2626',
    primaryLight: '#fef2f2',
    primaryBorder: '#fecaca',
    primaryRing: 'rgba(239, 68, 68, 0.5)',
    textPrimary: '#dc2626',
    textPrimaryDark: '#f87171',
    bgLight: '#fee2e2',
    bgDark: 'rgba(239, 68, 68, 0.2)',
  },
  purple: {
    primary: '#a855f7',
    primaryHover: '#9333ea',
    primaryLight: '#faf5ff',
    primaryBorder: '#e9d5ff',
    primaryRing: 'rgba(168, 85, 247, 0.5)',
    textPrimary: '#9333ea',
    textPrimaryDark: '#c084fc',
    bgLight: '#f3e8ff',
    bgDark: 'rgba(168, 85, 247, 0.2)',
  },
  amber: {
    primary: '#f59e0b',
    primaryHover: '#d97706',
    primaryLight: '#fffbeb',
    primaryBorder: '#fde68a',
    primaryRing: 'rgba(245, 158, 11, 0.5)',
    textPrimary: '#d97706',
    textPrimaryDark: '#fbbf24',
    bgLight: '#fef3c7',
    bgDark: 'rgba(245, 158, 11, 0.2)',
  },
  violet: {
    primary: '#8b5cf6',
    primaryHover: '#7c3aed',
    primaryLight: '#f5f3ff',
    primaryBorder: '#ddd6fe',
    primaryRing: 'rgba(139, 92, 246, 0.5)',
    textPrimary: '#7c3aed',
    textPrimaryDark: '#a78bfa',
    bgLight: '#ede9fe',
    bgDark: 'rgba(139, 92, 246, 0.2)',
  },
};

export function getBrandColors(color: string): BrandColors {
  return PALETTES[color] || PALETTES.indigo;
}

export function btnStyle(colors: BrandColors, disabled = false): Record<string, string> {
  if (disabled) return { backgroundColor: '#cbd5e1', color: '#94a3b8', cursor: 'not-allowed' };
  return { backgroundColor: colors.primary, color: 'white' };
}

export function btnHoverStyle(colors: BrandColors): string {
  return colors.primaryHover;
}
