import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, FloatingActionButton, SearchBar, StatusFilter, TaskCard } from '@/components';
import { SEARCH_DEBOUNCE_MS } from '@/constants';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useDebounce } from '@/hooks/useDebounce';
import { useFilteredTasks } from '@/hooks/useFilteredTasks';
import { useDeleteTask, useHasHydrated, useTasks, useToggleTaskComplete } from '@/store/taskStore';
import type { HomeScreenProps, TaskCardOrigin } from '@/types/navigation';
import type { Task, TaskFilter } from '@/types/task';

export function HomeScreen({ navigation }: HomeScreenProps) {
  const { colors, spacing, typography } = useAppTheme();
  const insets = useSafeAreaInsets();

  const tasks = useTasks();
  const hasHydrated = useHasHydrated();
  const toggleTaskComplete = useToggleTaskComplete();
  const deleteTask = useDeleteTask();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TaskFilter>('all');
  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS);

  const filteredTasks = useFilteredTasks(tasks, debouncedQuery, filter);

  // Adding or deleting a task should snap the list back to the top.
  const listRef = useRef<FlashListRef<Task>>(null);
  const prevCount = useRef(tasks.length);
  useEffect(() => {
    if (tasks.length !== prevCount.current) {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
    prevCount.current = tasks.length;
  }, [tasks.length]);

  const handleToggle = useCallback((id: string) => toggleTaskComplete(id), [toggleTaskComplete]);
  const handleDelete = useCallback((id: string) => deleteTask(id), [deleteTask]);
  const handleOpen = useCallback(
    (id: string, origin?: TaskCardOrigin) =>
      navigation.navigate('TaskForm', { taskId: id, origin }),
    [navigation],
  );
  const handleCreate = useCallback(() => {
    Keyboard.dismiss();
    navigation.navigate('TaskForm');
  }, [navigation]);

  // Changing the filter or tapping non-input areas should drop the search keyboard.
  const handleFilterChange = useCallback((next: TaskFilter) => {
    Keyboard.dismiss();
    setFilter(next);
  }, []);

  const dismissKeyboard = useCallback(() => Keyboard.dismiss(), []);

  // Native-stack header bar can't be tapped wholesale from JS, so make the
  // title itself a press target that drops the search keyboard.
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Pressable
          onPress={dismissKeyboard}
          hitSlop={16}
          accessibilityRole="header"
        >
          <Text style={[typography.heading, { color: colors.text }]}>
            Tasks
          </Text>
        </Pressable>
      ),
    });
  }, [navigation, dismissKeyboard, colors.text, typography]);

  const renderItem = useCallback(
    ({ item, index }: { item: Task; index: number }) => (
      <TaskCard
        index={index}
        task={item}
        onToggle={handleToggle}
        onDelete={handleDelete}
        onPress={handleOpen}
      />
    ),
    [handleToggle, handleDelete, handleOpen],
  );

  const keyExtractor = useCallback((item: Task) => item.id, []);

  const hasTasks = tasks.length > 0;
  const isFiltering = debouncedQuery.trim().length > 0 || filter !== 'all';

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: spacing.md }]}>
      {hasTasks ? (
        <View style={[styles.controls, { paddingHorizontal: spacing.lg, gap: spacing.md, marginBottom: spacing.md }]}>
          <SearchBar value={query} onChangeText={setQuery} />
          <StatusFilter value={filter} onChange={handleFilterChange} />
        </View>
      ) : null}

      {!hasHydrated ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : filteredTasks.length > 0 ? (
        <FlashList
          ref={listRef}
          data={filteredTasks}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 96 }}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        <Pressable style={styles.fill} onPress={dismissKeyboard} accessible={false}>
          <EmptyState
            icon={isFiltering ? 'search-outline' : 'clipboard-outline'}
            title={isFiltering ? 'No matching tasks' : 'No tasks yet'}
            message={
              isFiltering
                ? 'Try a different search term or status filter.'
                : 'Tap the + button to create your first task.'
            }
          />
        </Pressable>
      )}

      <FloatingActionButton onPress={handleCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  controls: {},
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fill: { flex: 1 },
});
