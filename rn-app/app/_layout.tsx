import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#242b38" },
          headerTintColor: "#e9edf5",
          contentStyle: { backgroundColor: "#1b202b" }
        }}
      />
      <StatusBar style="light" />
    </>
  );
}
