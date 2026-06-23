export interface ThemePalette {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  success: string;
  danger: string;
  dangerText: string;
  shadow: string;
  overlay: string;
}

export const lightPalette: ThemePalette = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF0F4',
  border: '#E2E5EA',
  text: '#16181D',
  textMuted: '#6B7280',
  primary: '#4F46E5',
  primaryText: '#FFFFFF',
  success: '#16A34A',
  danger: '#DC2626',
  dangerText: '#FFFFFF',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.4)',
};

export const darkPalette: ThemePalette = {
  background: '#0E0F12',
  surface: '#17191E',
  surfaceAlt: '#202329',
  border: '#2A2E36',
  text: '#F3F4F6',
  textMuted: '#9CA3AF',
  primary: '#6366F1',
  primaryText: '#FFFFFF',
  success: '#22C55E',
  danger: '#EF4444',
  dangerText: '#FFFFFF',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.6)',
};
