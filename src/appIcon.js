import { Platform } from 'react-native'
import { getAppIconName, setAlternateAppIcon, supportsAlternateIcons } from 'expo-alternate-app-icons'

// Appikonen visar läget: orange och arg medan något tjatar, grön och nöjd
// när tjatet är klart. iOS visar en liten ruta varje gång ikonen byts, så
// den byts bara när den faktiskt behöver ändras. Android hoppas över -
// där kan ett ikonbyte stänga appen.
function show(name) {
  if (Platform.OS !== 'ios' || !supportsAlternateIcons) return
  if (getAppIconName() === name) return
  setAlternateAppIcon(name).catch(() => {}) // fel ikon är inget att stoppa appen för
}

export function showDoneIcon() {
  show('Klar')
}

export function showNaggingIcon() {
  show(null)
}
