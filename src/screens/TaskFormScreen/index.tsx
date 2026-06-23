import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { z } from "zod";

import Header from "@/components/Header";
import { TASK_DESCRIPTION_MAX, TASK_TITLE_MAX } from "@/constants";
import { useAppTheme } from "@/hooks/useAppTheme";
import {
  useAddTask,
  useDeleteTask,
  useTaskById,
  useUpdateTask,
} from "@/store/taskStore";
import type {
  SharedText,
  TaskFormScreenProps,
} from "@/types/navigation";
import { formatDate } from "@/utils/date";

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(TASK_TITLE_MAX, `Title must be ${TASK_TITLE_MAX} characters or fewer`),
  description: z
    .string()
    .trim()
    .max(
      TASK_DESCRIPTION_MAX,
      `Description must be ${TASK_DESCRIPTION_MAX} characters or fewer`,
    )
    .optional(),
});

type FormValues = z.infer<typeof schema>;

// Window-space rect of a form field, captured on layout. A ghost flies from the
// tapped card's matching element (route.params.origin) into this rect.
type Rect = { x: number; y: number; width: number; height: number };

const OPEN_MS = 340;
const CLOSE_MS = 260;

/**
 * A copy of a card element (title/description/date) that flies from its origin
 * rect into the matching form field as `progress` goes 0 → 1, fading out as it
 * lands so the real field takes over. Renders nothing until its target is
 * measured.
 */
function MorphGhost({
  progress,
  origin,
  target,
  numberOfLines,
  style,
}: {
  progress: SharedValue<number>;
  origin: SharedText;
  target: SharedValue<Rect | null>;
  numberOfLines: number;
  style: StyleProp<TextStyle>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const tgt = target.value;
    if (!tgt) return { opacity: 0 };
    const p = progress.value;
    return {
      opacity: interpolate(p, [0, 0.15, 0.85, 1], [1, 1, 1, 0]),
      left: interpolate(p, [0, 1], [origin.x, tgt.x]),
      top: interpolate(p, [0, 1], [origin.y, tgt.y]),
      width: interpolate(p, [0, 1], [origin.width, tgt.width]),
    };
  });

  return (
    <Animated.Text
      pointerEvents="none"
      numberOfLines={numberOfLines}
      style={[styles.ghost, style, animatedStyle]}
    >
      {origin.text}
    </Animated.Text>
  );
}

export function TaskFormScreen({ navigation, route }: TaskFormScreenProps) {
  const { colors, radius, spacing, typography } = useAppTheme();
  const insets = useSafeAreaInsets();

  const taskId = route.params?.taskId;
  const origin = route.params?.origin;
  const existing = useTaskById(taskId);
  const isEditing = Boolean(taskId);

  const addTask = useAddTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  // Confirmation dialog for the header trash action (edit mode only).
  const [confirmVisible, setConfirmVisible] = useState(false);

  // 0 = collapsed onto the card, 1 = fully open form. Reanimated 4 dropped
  // sharedTransitionTag, so we drive the shared-element morph by hand. One
  // measured target rect per morphing field.
  const progress = useSharedValue(0);
  const titleTarget = useSharedValue<Rect | null>(null);
  const descTarget = useSharedValue<Rect | null>(null);
  const dateTarget = useSharedValue<Rect | null>(null);

  // Guards against re-running the open animation across layout passes, and
  // against beforeRemove re-intercepting the action we dispatch ourselves.
  const opened = useRef(false);
  const closing = useRef(false);
  // Deletion pops immediately — skip the shared-element close morph.
  const deleting = useRef(false);
  const titleInputRef = useRef<TextInput>(null);
  const descInputRef = useRef<TextInput>(null);
  const dateTextRef = useRef<Text>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      title: existing?.title ?? "",
      description: existing?.description ?? "",
    },
  });

  const open = useCallback(() => {
    if (opened.current) return;
    opened.current = true;
    progress.value = withTiming(1, {
      duration: OPEN_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  // No origin (e.g. opened from the FAB) → nothing to morph from, just fade in.
  // With an origin we wait for the Title field's measured rect before opening so
  // the ghosts have destinations on their very first frame.
  useEffect(() => {
    if (!origin) open();
  }, [origin, open]);

  // Title layout gates the open so the morph never starts without a destination;
  // description/date measure into their own rects in the same layout pass.
  const measureTitle = useCallback(() => {
    if (!origin) return;
    titleInputRef.current?.measureInWindow((x, y, width, height) => {
      if (width !== 0 || height !== 0) {
        titleTarget.value = { x, y, width, height };
      }
      open(); // open even on a failed measure → plain fade fallback
    });
  }, [origin, open, titleTarget]);

  const measureDesc = useCallback(() => {
    descInputRef.current?.measureInWindow((x, y, width, height) => {
      if (width !== 0 || height !== 0) {
        descTarget.value = { x, y, width, height };
      }
    });
  }, [descTarget]);

  const measureDate = useCallback(() => {
    dateTextRef.current?.measureInWindow((x, y, width, height) => {
      if (width !== 0 || height !== 0) {
        dateTarget.value = { x, y, width, height };
      }
    });
  }, [dateTarget]);

  // Play the close animation before the screen actually unmounts. Covers every
  // exit path (Header back, submit, Android hardware back) because the native
  // stack uses animation:"none" and won't animate the dismissal for us.
  useEffect(() => {
    const unsub = navigation.addListener("beforeRemove", (e) => {
      if (closing.current || deleting.current) return;
      e.preventDefault();
      closing.current = true;
      const finish = () => navigation.dispatch(e.data.action);
      progress.value = withTiming(
        0,
        { duration: CLOSE_MS, easing: Easing.in(Easing.cubic) },
        (done) => {
          if (done) scheduleOnRN(finish);
        },
      );
    });
    return unsub;
  }, [navigation, progress]);

  const onSubmit = handleSubmit((values) => {
    if (isEditing && taskId) {
      updateTask(taskId, {
        title: values.title,
        description: values.description,
      });
    } else {
      addTask({ title: values.title, description: values.description });
    }
    navigation.goBack();
  });

  const handleConfirmDelete = useCallback(() => {
    setConfirmVisible(false);
    deleting.current = true;
    if (taskId) deleteTask(taskId);
    navigation.goBack();
  }, [deleteTask, navigation, taskId]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  // Form fades in behind the ghosts so they appear to settle into their fields
  // rather than crossing already-visible content. When morphing we keep the form
  // stationary (rise 0) so the measured targets match where the fields land —
  // otherwise the ghosts would touch down below them. With no origin (FAB) there
  // are no ghosts, so the form rises in on its own.
  const contentRise = origin ? 0 : 16;
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.25, 1],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [contentRise, 0]) },
    ],
  }));

  return (
    <View style={styles.flex}>
      {/* Solid backdrop fades in over the Home screen showing through the
          transparentModal, so the morph reads as the card lifting up. */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: colors.background },
          backdropStyle,
        ]}
      />

      <Animated.View style={[styles.flex, contentStyle]}>
        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingTop: insets.top,
            paddingBottom: spacing.lg,
            gap: spacing.xl,
          }}
          keyboardShouldPersistTaps="handled"
          bottomOffset={spacing.xxl * 3}
        >
          <Header
            rightIcon={isEditing ? "trash-outline" : undefined}
            onRightPress={() => setConfirmVisible(true)}
            rightAccessibilityLabel="Delete task"
            rightTint={colors.danger}
          />
          <View style={{ gap: spacing.sm }}>
            <Text style={[typography.label, { color: colors.text }]}>Title</Text>
            <Controller
              control={control}
              name="title"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  ref={titleInputRef}
                  onLayout={measureTitle}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="What needs to be done?"
                  placeholderTextColor={colors.textMuted}
                  autoFocus={!isEditing}
                  maxLength={TASK_TITLE_MAX}
                  style={[
                    styles.input,
                    typography.body,
                    {
                      color: colors.text,
                      backgroundColor: colors.surface,
                      borderColor: errors.title ? colors.danger : colors.border,
                      borderRadius: radius.md,
                      padding: spacing.md,
                    },
                  ]}
                />
              )}
            />
            {errors.title ? (
              <Text style={[typography.caption, { color: colors.danger }]}>
                {errors.title.message}
              </Text>
            ) : null}
          </View>

          <View style={{ gap: spacing.sm }}>
            <Text style={[typography.label, { color: colors.text }]}>
              Description (optional)
            </Text>
            <Controller
              control={control}
              name="description"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  ref={descInputRef}
                  onLayout={measureDesc}
                  value={value ?? ""}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Add more detail…"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={4}
                  maxLength={TASK_DESCRIPTION_MAX}
                  textAlignVertical="top"
                  style={[
                    styles.input,
                    styles.multiline,
                    typography.body,
                    {
                      color: colors.text,
                      backgroundColor: colors.surface,
                      borderColor: errors.description
                        ? colors.danger
                        : colors.border,
                      borderRadius: radius.md,
                      padding: spacing.md,
                    },
                  ]}
                />
              )}
            />
            {errors.description ? (
              <Text style={[typography.caption, { color: colors.danger }]}>
                {errors.description.message}
              </Text>
            ) : null}
          </View>

          {/* Created date — the morph target for the card's date. Edit-only:
              create mode has no timestamp yet (and no origin to morph from). */}
          {existing ? (
            <View style={{ gap: spacing.sm }}>
              <Text style={[typography.label, { color: colors.text }]}>
                Created
              </Text>
              <Text
                ref={dateTextRef}
                onLayout={measureDate}
                style={[typography.caption, { color: colors.textMuted }]}
              >
                {formatDate(existing.createdAt)}
              </Text>
            </View>
          ) : null}
        </KeyboardAwareScrollView>

        {/* Footer rides above the keyboard via KeyboardStickyView. Its translateY is
            `height + offset`, where height is 0 closed and negative when open — so a
            positive `closed` offset would push the footer DOWN off the bottom edge.
            Keep closed at 0 (footer sits naturally at the bottom) and clear the home
            indicator with paddingBottom instead. When open it sits flush above the
            keyboard. */}
        <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
          <View
            style={[
              styles.footer,
              {
                paddingHorizontal: spacing.lg,
                paddingTop: spacing.lg,
                paddingBottom: insets.bottom + spacing.xs,
                backgroundColor: colors.background,
                borderTopColor: colors.border,
              },
            ]}
          >
            <Pressable
              onPress={onSubmit}
              disabled={!isValid}
              accessibilityRole="button"
              style={[
                styles.submit,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radius.md,
                  padding: spacing.lg,
                  opacity: isValid ? 1 : 0.5,
                },
              ]}
            >
              <Text style={[typography.label, { color: colors.primaryText }]}>
                {isEditing ? "Save Changes" : "Create Task"}
              </Text>
            </Pressable>
          </View>
        </KeyboardStickyView>
      </Animated.View>

      {/* Shared elements: copies of the tapped card's title/description/date that
          fly into the matching form fields. Above the content, fading as they land. */}
      {origin ? (
        <>
          <MorphGhost
            progress={progress}
            origin={origin.title}
            target={titleTarget}
            numberOfLines={1}
            style={[typography.label, { color: colors.text }]}
          />
          {origin.description ? (
            <MorphGhost
              progress={progress}
              origin={origin.description}
              target={descTarget}
              numberOfLines={2}
              style={[typography.caption, { color: colors.textMuted }]}
            />
          ) : null}
          <MorphGhost
            progress={progress}
            origin={origin.date}
            target={dateTarget}
            numberOfLines={1}
            style={[typography.caption, { color: colors.textMuted }]}
          />
        </>
      ) : null}

      {/* Destructive-action confirmation. Lives over the form so dismissing it
          keeps the user on the screen; confirming deletes then pops back. */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setConfirmVisible(false)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}
          onPress={() => setConfirmVisible(false)}
        >
          {/* Stop propagation so taps inside the card don't dismiss. */}
          <Pressable
            style={[
              styles.dialog,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.lg,
                padding: spacing.xl,
                gap: spacing.sm,
              },
            ]}
          >
            <Text style={[typography.heading, { color: colors.text }]}>
              Delete task?
            </Text>
            <Text style={[typography.body, { color: colors.textMuted }]}>
              This task will be permanently removed. This can&apos;t be undone.
            </Text>

            <View style={[styles.dialogActions, { gap: spacing.sm, marginTop: spacing.md }]}>
              <Pressable
                onPress={() => setConfirmVisible(false)}
                accessibilityRole="button"
                style={[
                  styles.dialogButton,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderRadius: radius.md,
                    paddingVertical: spacing.md,
                  },
                ]}
              >
                <Text style={[typography.label, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmDelete}
                accessibilityRole="button"
                style={[
                  styles.dialogButton,
                  {
                    backgroundColor: colors.danger,
                    borderRadius: radius.md,
                    paddingVertical: spacing.md,
                  },
                ]}
              >
                <Text style={[typography.label, { color: colors.dangerText }]}>
                  Delete
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  input: { borderWidth: StyleSheet.hairlineWidth },
  multiline: { minHeight: 110 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth },
  submit: { alignItems: "center", justifyContent: "center" },
  ghost: { position: "absolute" },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  dialog: {
    width: "100%",
    maxWidth: 380,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dialogActions: { flexDirection: "row" },
  dialogButton: { flex: 1, alignItems: "center", justifyContent: "center" },
});
