import { requireOptionalNativeModule } from 'expo'

// Appens egen lilla native-modul (ios/TjatHaptikModule.swift). Den finns bara
// på iOS - på Android blir anropen tomma och appen faller tillbaka på Vibration.
const native = requireOptionalNativeModule('TjatHaptik')

// iOS tystar all haptik medan mikrofonen spelar in - det här slår på den igen
export function allowHapticsWhileRecording() {
  native?.allowDuringRecording()
}

// Ihållande vibration utan pauser. Ger false om den inte gick att starta.
export function startBuzz() {
  return native?.startBuzz() ?? false
}

export function stopBuzz() {
  native?.stopBuzz()
}
