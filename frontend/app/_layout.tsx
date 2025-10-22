import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export default function RootLayout() {
  const loadUserFromStorage = useAuthStore((state) => state.loadUserFromStorage);

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth/login" />
      <Stack.Screen name="auth/register" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}