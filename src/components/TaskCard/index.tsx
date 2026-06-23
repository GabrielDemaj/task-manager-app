import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { memo, useCallback, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, {
  Easing,
  FadeOutLeft,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useAppTheme } from "@/hooks/useAppTheme";
import type { SharedRect, TaskCardOrigin } from "@/types/navigation";
import type { Task } from "@/types/task";
import { formatDate } from "@/utils/date";

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onPress: (id: string, origin?: TaskCardOrigin) => void;
  /** List position, used to stagger the entrance. Defaults to 0 (no delay). */
  index?: number;
}

// Entrance motion tokens. A decelerating ease-out (no spring overshoot) plus a
// barely-there scale reads as the card settling into place rather than bouncing
// in. Cards cascade with a small, capped stagger so a freshly loaded list
// ripples in instead of every row popping at once.
const ENTER_DURATION = 380;
const ENTER_EASING = Easing.bezier(0.16, 1, 0.3, 1);
const ENTER_RISE = 14;
const ENTER_SCALE_FROM = 0.985;
const STAGGER_STEP_MS = 55;
const MAX_STAGGER_STEPS = 6;

// Promisify measureInWindow so the three shared elements can be measured in
// parallel before navigating. Resolves null if the node is missing or unlaid-out.
function measureNode(node: Text | null): Promise<SharedRect | null> {
  return new Promise((resolve) => {
    if (!node) return resolve(null);
    node.measureInWindow((x, y, width, height) => {
      resolve(width === 0 && height === 0 ? null : { x, y, width, height });
    });
  });
}

function TaskCardComponent({
  task,
  onToggle,
  onDelete,
  onPress,
  index = 0,
}: TaskCardProps) {
  const { colors, radius, spacing, typography } = useAppTheme();
  const completed = task.completed;

  // Cap the cascade so a long list doesn't trail off for seconds: only the rows
  // visible on first paint ripple in; everything past that enters immediately.
  const reduceMotion = useReducedMotion();
  const enterDelay = Math.min(index, MAX_STAGGER_STEPS) * STAGGER_STEP_MS;

  const entering = useCallback(() => {
    "worklet";
    if (reduceMotion) {
      return {
        initialValues: { opacity: 0 },
        animations: {
          opacity: withDelay(enterDelay, withTiming(1, { duration: 200 })),
        },
      };
    }
    const timing = { duration: ENTER_DURATION, easing: ENTER_EASING };
    return {
      initialValues: {
        opacity: 0,
        transform: [{ translateY: ENTER_RISE }, { scale: ENTER_SCALE_FROM }],
      },
      animations: {
        opacity: withDelay(enterDelay, withTiming(1, timing)),
        transform: [
          { translateY: withDelay(enterDelay, withTiming(0, timing)) },
          { scale: withDelay(enterDelay, withTiming(1, timing)) },
        ],
      },
    };
  }, [enterDelay, reduceMotion]);

  const titleRef = useRef<Text>(null);
  const descRef = useRef<Text>(null);
  const dateRef = useRef<Text>(null);

  const checkScale = useSharedValue(1);
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const handleToggle = useCallback(() => {
    Haptics.selectionAsync();

    checkScale.value = withSpring(1, {
      damping: 20,
      stiffness: 300,
      mass: 0.8,
      overshootClamping: true,
    });

    onToggle(task.id);
  }, [checkScale, onToggle, task.id]);

  const handleDelete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDelete(task.id);
  }, [onDelete, task.id]);

  // Measure the title/description/date rects so the form can morph each into its
  // matching field. measureInWindow is async; without a usable title or date rect
  // we open with no morph (form falls back to a plain fade entrance).
  const handlePress = useCallback(async () => {
    const [titleRect, descRect, dateRect] = await Promise.all([
      measureNode(titleRef.current),
      measureNode(descRef.current),
      measureNode(dateRef.current),
    ]);
    if (!titleRect || !dateRect) {
      onPress(task.id);
      return;
    }
    onPress(task.id, {
      title: { ...titleRect, text: task.title },
      description:
        descRect && task.description
          ? { ...descRect, text: task.description }
          : undefined,
      date: { ...dateRect, text: formatDate(task.createdAt) },
    });
  }, [onPress, task.id, task.title, task.description, task.createdAt]);

  const renderRightActions = useCallback(
    () => (
      <Pressable
        onPress={handleDelete}
        accessibilityRole="button"
        accessibilityLabel="Delete task"
        style={[styles.deleteAction, { backgroundColor: colors.danger }]}
      >
        <Ionicons name="trash-outline" size={22} color={colors.dangerText} />
        <Text style={[typography.caption, { color: colors.dangerText }]}>
          Delete
        </Text>
      </Pressable>
    ),
    [colors.danger, colors.dangerText, handleDelete, typography.caption],
  );

  return (
    <Animated.View
      entering={entering}
      exiting={FadeOutLeft.duration(220)}
      layout={LinearTransition.springify()}
      style={styles.wrapper}
    >
      <ReanimatedSwipeable
        renderRightActions={renderRightActions}
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        containerStyle={[styles.swipeable, { borderRadius: radius.lg }]}
      >
        <Pressable
          onPress={handlePress}
          accessibilityRole="button"
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              // Left corners rounded; right corners square so the card edge
              // butts flush against the delete action when swiped open. The
              // swipeable container (overflow:hidden + borderRadius) clips the
              // whole row rounded when closed.
              borderTopLeftRadius: radius.lg,
              borderBottomLeftRadius: radius.lg,
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0,
              padding: spacing.lg,
              gap: spacing.md,
            },
          ]}
        >
          <Pressable
            onPress={handleToggle}
            hitSlop={8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: completed }}
            accessibilityLabel={
              completed ? "Mark as incomplete" : "Mark as completed"
            }
          >
            <Animated.View
              style={[
                styles.checkbox,
                {
                  borderColor: completed ? colors.success : colors.border,
                  backgroundColor: completed ? colors.success : "transparent",
                },
                checkStyle,
              ]}
            >
              {completed ? (
                <Ionicons
                  name="checkmark"
                  size={16}
                  color={colors.primaryText}
                />
              ) : null}
            </Animated.View>
          </Pressable>

          <View style={styles.body}>
            <Text
              ref={titleRef}
              numberOfLines={1}
              style={[
                typography.label,
                {
                  color: colors.text,
                  textDecorationLine: completed ? "line-through" : "none",
                  opacity: completed ? 0.6 : 1,
                },
              ]}
            >
              {task.title}
            </Text>
            {task.description ? (
              <Text
                ref={descRef}
                numberOfLines={2}
                style={[typography.caption, { color: colors.textMuted }]}
              >
                {task.description}
              </Text>
            ) : null}
            <Text
              ref={dateRef}
              style={[typography.caption, { color: colors.textMuted }]}
            >
              {formatDate(task.createdAt)}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      </ReanimatedSwipeable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  swipeable: { overflow: "hidden" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1 },
  deleteAction: {
    width: 88,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
});

/**
 * Re-render only when this task's own data or a handler identity changes.
 * Parent passes stable useCallback handlers, so memo holds across list updates.
 */
export const TaskCard = memo(TaskCardComponent);
