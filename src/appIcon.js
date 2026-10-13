import { Platform } from 'react-native'
import { getAppIconName, setAlternateAppIcon, supportsAlternateIcons } from 'expo-alternate-app-icons'
import { getSettings, saveSetting } from './store.js'

// Appikonen visar läget: grön och nöjd när tjatet är klart, orange och arg
// när man snoozar. Att starta ett nytt tjat ändrar ingenting. iOS visar en
// ruta om att ikonen ändrats varje gång den byts, och den går inte att
// stänga av - därför byts ikonen högst en gång per dag. Android hoppas
// över - där kan ett ikonbyte stänga appen.
function show(name) {
  if (Platform.OS !== 'ios' || !supportsAlternateIcons) return
  if (getAppIconName() === name) return

  const today = new Date().toDateString()
  if (getSettings().iconChangedOn === today) return
  saveSetting('iconChangedOn', today)
  setAlternateAppIcon(name).catch(() => {}) // fel ikon är inget att stoppa appen för
}

export function showDoneIcon() {
  show('Klar')
}

export function showNaggingIcon() {
  show(null)
}
