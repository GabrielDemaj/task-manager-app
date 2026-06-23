import { darkPalette, lightPalette, type ThemePalette } from './colors';
import { radius, spacing, typography, type Radius, type Spacing, type Typography } from './tokens';

export interface AppTheme {
  dark: boolean;
  colors: ThemePalette;
  spacing: Spacing;
  radius: Radius;
  typography: Typography;
}

export const lightTheme: AppTheme = {
  dark: false,
  colors: lightPalette,
  spacing,
  radius,
  typography,
};

export const darkTheme: AppTheme = {
  dark: true,
  colors: darkPalette,
  spacing,
  radius,
  typography,
};

export * from './colors';
export * from './tokens';
