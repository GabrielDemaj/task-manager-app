import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/** Window-space rect captured via `measureInWindow`. */
export type SharedRect = { x: number; y: number; width: number; height: number };

/** A measured rect plus the text it framed, for a single morphing element. */
export type SharedText = SharedRect & { text: string };

/**
 * Window-space rects of a tapped card's title/description/date. Drives the DIY
 * shared-element morph into the form. Reanimated 4 dropped the native
 * `sharedTransitionTag` API, so we animate this ourselves. description is absent
 * when the task has none.
 */
export type TaskCardOrigin = {
  title: SharedText;
  description?: SharedText;
  date: SharedText;
};

export type RootStackParamList = {
  Home: undefined;
  /** taskId absent → create mode; present → edit mode. origin drives the morph. */
  TaskForm: { taskId?: string; origin?: TaskCardOrigin } | undefined;
};

export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
export type TaskFormScreenProps = NativeStackScreenProps<RootStackParamList, 'TaskForm'>;

// Enables global type-safety for navigation.navigate / useNavigation.
declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
