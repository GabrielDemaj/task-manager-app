import { useColorScheme } from 'react-native';

import { darkTheme, lightTheme, type AppTheme } from '@/theme';

/** Resolves the active {@link AppTheme} from the device color scheme. */
export function useAppTheme(): AppTheme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkTheme : lightTheme;
}
