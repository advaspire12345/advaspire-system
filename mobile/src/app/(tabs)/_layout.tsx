import { Tabs } from "expo-router";
import { useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  const scheme = useColorScheme();
  const active = "#615DFA";
  const inactive = scheme === "dark" ? "#9CA3AF" : "#6B7280";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: active,
        tabBarInactiveTintColor: inactive,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
