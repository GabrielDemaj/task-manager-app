import { useAppTheme } from "@/hooks/useAppTheme";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StyleSheet, TouchableOpacity, View } from "react-native";

type HeaderProps = {
  /** Override the default `navigation.goBack()` behaviour. */
  onBack?: () => void;
  /** Trailing action icon. When omitted, only the back button renders. */
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  rightAccessibilityLabel?: string;
  /** Icon tint for the trailing action (defaults to the text colour). */
  rightTint?: string;
};

const Header = ({
  onBack,
  rightIcon,
  onRightPress,
  rightAccessibilityLabel,
  rightTint,
}: HeaderProps) => {
  const { colors, spacing, radius } = useAppTheme();
  const { goBack } = useNavigation();
  return (
    // Bottom hairline divider separates the header from the form. Negative
    // horizontal margin cancels the screen's paddingHorizontal so the border
    // runs full-bleed, then paddingHorizontal re-aligns the button. The screen
    // already pads by insets.top, so only small internal spacing here.
    <View
      style={[
        styles.bar,
        {
          marginTop: spacing.sm,
          marginHorizontal: -spacing.lg,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <TouchableOpacity
        onPress={onBack ?? goBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        activeOpacity={0.7}
        hitSlop={8}
        style={[
          styles.button,
          {
            backgroundColor: colors.surfaceAlt,
            borderColor: colors.border,
            borderRadius: radius.md,
          },
        ]}
      >
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </TouchableOpacity>

      {rightIcon ? (
        <TouchableOpacity
          onPress={onRightPress}
          accessibilityRole="button"
          accessibilityLabel={rightAccessibilityLabel}
          activeOpacity={0.7}
          hitSlop={8}
          style={[
            styles.button,
            {
              backgroundColor: colors.surfaceAlt,
              borderColor: colors.border,
              borderRadius: radius.md,
            },
          ]}
        >
          <Ionicons name={rightIcon} size={22} color={rightTint ?? colors.text} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  button: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export default Header;
