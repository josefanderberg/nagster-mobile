import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import HemScreen from './src/screens/HemScreen.js'
import VaktScreen from './src/screens/VaktScreen.js'
import { colors } from './src/theme.js'

const Stack = createNativeStackNavigator()

export default function App() {
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
        <Stack.Screen name="Vakt" component={VaktScreen} options={{ title: 'Rörelsevakt' }} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
