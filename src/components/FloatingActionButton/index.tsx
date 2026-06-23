import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { memo, useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useAppTheme } from '@/hooks/useAppTheme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

function FloatingActionButtonComponent({ onPress, icon = 'add' }: FloatingActionButtonProps) {
  const { colors, spacing } = useAppTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.9, { duration: 120 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 120 });
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  }, [onPress]);

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel="Add task"
      style={[
        styles.fab,
        { backgroundColor: colors.primary, bottom: spacing.xl, right: spacing.xl, shadowColor: colors.shadow },
        animatedStyle,
      ]}
    >
      <Ionicons name={icon} size={28} color={colors.primaryText} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});

export const FloatingActionButton = memo(FloatingActionButtonComponent);
