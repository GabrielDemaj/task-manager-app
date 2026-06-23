import {
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavDefaultTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/useAppTheme';
import { AppNavigator } from '@/navigation/AppNavigator';

export default function App() {
  const theme = useAppTheme();
  const base = theme.dark ? NavDarkTheme : NavDefaultTheme;

  const navTheme: Theme = {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.danger,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <NavigationContainer theme={navTheme}>
            <AppNavigator />
          </NavigationContainer>
          <StatusBar style={theme.dark ? 'light' : 'dark'} />
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
