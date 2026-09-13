import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from './types';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { DiagnosticTestScreen } from '../screens/onboarding/DiagnosticTestScreen';
import { DiagnosticResultScreen } from '../screens/onboarding/DiagnosticResultScreen';
import { GoalsScreen } from '../screens/onboarding/GoalsScreen';
import { NativeLanguageScreen } from '../screens/onboarding/NativeLanguageScreen';
import { FocusAreasScreen } from '../screens/onboarding/FocusAreasScreen';
import { ModelDownloadScreen } from '../screens/onboarding/ModelDownloadScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
      }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="DiagnosticTest" component={DiagnosticTestScreen} />
      <Stack.Screen name="DiagnosticResult" component={DiagnosticResultScreen} />
      <Stack.Screen name="Goals" component={GoalsScreen} />
      <Stack.Screen name="NativeLanguage" component={NativeLanguageScreen} />
      <Stack.Screen name="FocusAreas" component={FocusAreasScreen} />
      <Stack.Screen name="ModelDownload" component={ModelDownloadScreen} />
    </Stack.Navigator>
  );
}
