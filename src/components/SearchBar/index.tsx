import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

function SearchBarComponent({ value, onChangeText, placeholder = 'Search tasks' }: SearchBarProps) {
  const { colors, radius, spacing, typography } = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, paddingHorizontal: spacing.md },
      ]}
    >
      <Ionicons name="search" size={18} color={colors.textMuted} />
      <TextInput
        style={[styles.input, typography.body, { color: colors.text, paddingVertical: spacing.md }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={8} accessibilityLabel="Clear search">
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1 },
});

export const SearchBar = memo(SearchBarComponent);
