import { Stack } from 'expo-router';

export default function PlaceLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#FF6B35' },
        headerTintColor: 'white',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
