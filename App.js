import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import HemScreen from './src/screens/HemScreen.js'
import NyttTjatScreen from './src/screens/NyttTjatScreen.js'
import VaktScreen from './src/screens/VaktScreen.js'
import { colors } from './src/theme.js'

const Stack = createNativeStackNavigator()

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="Hem" component={HemScreen} options={{ title: '😤 Nagster' }} />
        <Stack.Screen name="NyttTjat" component={NyttTjatScreen} options={{ title: 'Nytt tjat' }} />
        <Stack.Screen name="Vakt" component={VaktScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
