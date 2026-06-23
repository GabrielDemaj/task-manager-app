import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { HomeScreen } from "@/screens/HomeScreen";
import { TaskFormScreen } from "@/screens/TaskFormScreen";
import type { RootStackParamList } from "@/types/navigation";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "Tasks" }}
      />
      <Stack.Screen
        name="TaskForm"
        component={TaskFormScreen}
        options={{
          presentation: "transparentModal",
          headerShown: false,
          animation: "none",
          gestureEnabled: false,
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
    </Stack.Navigator>
  );
}
