import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack initialRouteName="LoginScreen" screenOptions={{ headerShown: false }} />
  );
}
