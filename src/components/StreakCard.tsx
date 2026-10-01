import { StyleSheet, Text, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { StyleProp, ViewStyle } from 'react-native';
import { lastNDaysActivity } from '../data';
import { colors, fonts, spacing } from '../theme';
import { Card } from './ui';

type Props = {
  streakDays: number;
  practiceDays: string[];
  style?: StyleProp<ViewStyle>;
};

export function StreakCard({ streakDays, practiceDays, style }: Props) {
  const activity = lastNDaysActivity(practiceDays, 7);
  const practicedToday = activity[activity.length - 1] ?? false;

  const caption = practicedToday
    ? 'Practiced today — nice!'
    : streakDays > 0
      ? 'Practice today to keep it going'
      : 'Finish an exercise to start a streak';

  return (
    <Card style={[styles.card, style]}>
      <View style={styles.badge}>
        <MaterialIcons
          name="local_fire_department"
          color={colors.streak}
          size={24}
        />
      </View>
      <View style={styles.info}>
        <View style={styles.countRow}>
          <Text style={styles.count}>{streakDays}</Text>
          <Text style={styles.countLabel}>day streak</Text>
        </View>
        <Text style={styles.caption}>{caption}</Text>
        <View style={styles.dots}>
          {activity.map((active, index) => {
            const isToday = index === activity.length - 1;
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  active && styles.dotActive,
                  isToday && styles.dotToday,
                ]}
              />
            );
          })}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.streakSoft,
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  count: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    fontFamily: fonts.extrabold,
    color: colors.streak,
  },
  countLabel: {
    marginLeft: spacing.sm,
    fontSize: 14,
    color: colors.textMuted,
    fontFamily: fonts.medium,
  },
  caption: {
    fontSize: 13,
    color: colors.textMuted,
    fontFamily: fonts.regular,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.borderBright,
  },
  dotActive: {
    backgroundColor: colors.streak,
    borderColor: colors.streak,
  },
  dotToday: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderColor: colors.text,
  },
});
