import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useAppTheme } from '@/hooks/useAppTheme';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
}

function EmptyStateComponent({ icon = 'checkbox-outline', title, message }: EmptyStateProps) {
  const { colors, spacing, typography } = useAppTheme();

  return (
    <Animated.View entering={FadeIn.duration(250)} style={[styles.container, { padding: spacing.xl }]}>
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: colors.surfaceAlt, marginBottom: spacing.lg },
        ]}
      >
        <Ionicons name={icon} size={36} color={colors.textMuted} />
      </View>
      <Text style={[typography.heading, { color: colors.text, marginBottom: spacing.xs }]}>{title}</Text>
      <Text style={[typography.body, styles.message, { color: colors.textMuted }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  message: { textAlign: 'center', maxWidth: 280 },
});

export const EmptyState = memo(EmptyStateComponent);
