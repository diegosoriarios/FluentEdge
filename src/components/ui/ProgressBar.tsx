import { StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../../theme';

export function ProgressBar({ progress }: { progress: number }) {
  const flex = Math.max(progress, 0.02);
  return (
    <View style={styles.progressTrack}>
      <LinearGradient
        colors={[colors.primary, colors.success]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.progressFill, { flex }]}>
        <View style={styles.progressTip} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  progressTrack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  progressTip: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 2,
    backgroundColor: colors.text,
    opacity: 0.9,
  },
});
