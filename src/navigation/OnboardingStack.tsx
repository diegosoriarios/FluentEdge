import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors, spacing } from '../theme';
import { useProfile } from '../context/ProfileContext';
import { useOnboarding } from '../context/OnboardingContext';
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
  const { retaking, cancelRetake } = useProfile();
  const { reset: resetDraft } = useOnboarding();
  const insets = useSafeAreaInsets();

  const handleCancelRetake = () => {
    resetDraft();
    cancelRetake();
  };

  return (
    <View style={styles.container}>
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
      {retaking ? (
        <Pressable
          accessibilityLabel="Cancel retake"
          style={[styles.cancelButton, { top: insets.top + spacing.sm }]}
          onPress={handleCancelRetake}>
          <Text style={styles.cancelText}>✕ Cancel retake</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cancelButton: {
    position: 'absolute',
    left: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
  },
});
