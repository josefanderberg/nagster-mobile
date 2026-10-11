import { useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import HemScreen from './src/screens/HemScreen.js'
import DetaljScreen from './src/screens/DetaljScreen.js'
import { setupNotifications } from './src/notifications.js'
import { colors } from './src/theme.js'

const Stack = createNativeStackNavigator()

export default function App() {
  // Registrerar notisknapparna (Klart/Snooza) och Android-kanalen
  useEffect(() => {
    setupNotifications()
  }, [])

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="Hem" component={HemScreen} options={{ title: 'Tjat' }} />
        <Stack.Screen name="Detalj" component={DetaljScreen} options={{ title: 'Tjat' }} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
