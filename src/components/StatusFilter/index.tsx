import * as Haptics from 'expo-haptics';
import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FILTER_OPTIONS } from '@/constants';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { TaskFilter } from '@/types/task';

interface StatusFilterProps {
  value: TaskFilter;
  onChange: (value: TaskFilter) => void;
}

function StatusFilterComponent({ value, onChange }: StatusFilterProps) {
  const { colors, radius, spacing, typography } = useAppTheme();

  const handlePress = useCallback(
    (next: TaskFilter) => {
      Haptics.selectionAsync();
      onChange(next);
    },
    [onChange],
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, padding: spacing.xs },
      ]}
    >
      {FILTER_OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => handlePress(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.segment,
              { borderRadius: radius.pill, paddingVertical: spacing.sm },
              active && { backgroundColor: colors.surface, shadowColor: colors.shadow },
              active && styles.activeShadow,
            ]}
          >
            <Text style={[typography.label, { color: active ? colors.primary : colors.textMuted }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center' },
  segment: { flex: 1, alignItems: 'center' },
  activeShadow: {
    elevation: 2,
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
});

export const StatusFilter = memo(StatusFilterComponent);
