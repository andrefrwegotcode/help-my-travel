import { Stack } from 'expo-router';

export default function PlaceLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0.5,
          borderBottomColor: '#EBEBEB',
        } as any,
        headerTintColor: '#222222',
        headerTitleStyle: { fontWeight: '600', fontSize: 17 },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
