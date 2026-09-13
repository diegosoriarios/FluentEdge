import { StatusBar, useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ModelProvider } from './src/context/ModelContext';
import { OnboardingProvider } from './src/context/OnboardingContext';
import { ProfileProvider } from './src/context/ProfileContext';
import { RootNavigator } from './src/navigation/RootNavigator';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

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
