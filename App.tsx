import { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { setConfig } from '@kesha-antonov/react-native-background-downloader';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ModelProvider } from './src/context/ModelContext';
import { OnboardingProvider } from './src/context/OnboardingContext';
import { ProfileProvider } from './src/context/ProfileContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { logDebug } from './src/services/debugLog';
import { colors } from './src/theme';

const KineticDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.card,
    border: colors.border,
    text: colors.text,
    primary: colors.primary,
    notification: colors.streak,
  },
};

function App() {
  useEffect(() => {
    setConfig({
      isLogsEnabled: true,
      showNotificationsEnabled: true,
      logCallback: (tag, message, ...args) => logDebug(tag, message, ...args),
    });
    logDebug('app', 'downloader setConfig applied (native logging + notifications on)');
  }, []);

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <StatusBar barStyle="light-content" />
        <ErrorBoundary>
          <ProfileProvider>
            <ModelProvider>
              <OnboardingProvider>
                <NavigationContainer theme={KineticDarkTheme}>
                  <RootNavigator />
                </NavigationContainer>
              </OnboardingProvider>
            </ModelProvider>
          </ProfileProvider>
        </ErrorBoundary>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

export default App;
