import { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { setConfig } from '@kesha-antonov/react-native-background-downloader';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ModelProvider } from './src/context/ModelContext';
import { OnboardingProvider } from './src/context/OnboardingContext';
import { ProfileProvider } from './src/context/ProfileContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { logDebug } from './src/services/debugLog';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

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
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ErrorBoundary>
        <ProfileProvider>
          <ModelProvider>
            <OnboardingProvider>
              <NavigationContainer theme={isDarkMode ? DarkTheme : DefaultTheme}>
                <RootNavigator />
              </NavigationContainer>
            </OnboardingProvider>
          </ModelProvider>
        </ProfileProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

export default App;
