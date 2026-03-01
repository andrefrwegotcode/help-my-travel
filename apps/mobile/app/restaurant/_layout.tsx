import { Stack } from 'expo-router';

export default function RestaurantLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#FF6B35' },
        headerTintColor: 'white',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="[placeId]" options={{ title: 'Restaurant' }} />
    </Stack>
  );
}
