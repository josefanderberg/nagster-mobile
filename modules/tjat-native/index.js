import { requireOptionalNativeModule } from 'expo'

// Appens egen lilla native-modul (ios/). Den finns bara på iOS - på Android
// blir anropen tomma och appen faller tillbaka på Vibration och expo-speech.
const haptik = requireOptionalNativeModule('TjatHaptik')
const tal = requireOptionalNativeModule('TjatTal')
const lyssna = requireOptionalNativeModule('TjatLyssna')

const SPEAK_TIMEOUT_MS = 10_000
const LISTEN_TIMEOUT_MS = 10_000

// iOS tystar all haptik medan mikrofonen spelar in - det här slår på den igen
export function allowHapticsWhileRecording() {
  haptik?.allowDuringRecording()
}

// Ihållande vibration utan pauser. Ger false om den inte gick att starta.
export function startBuzz() {
  return haptik?.startBuzz() ?? false
}

export function stopBuzz() {
  haptik?.stopBuzz()
}

// Läser in texten med telefonens bästa röst till en wav-fil och ger filens
// uri - eller null om det inte gick, så att tjatet startar ändå. Svarar inte
// talsyntesen ger vi upp efter tio sekunder hellre än att Starta fastnar.
export async function speakToFile(text, fileUri) {
  if (!tal) return null
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), SPEAK_TIMEOUT_MS))
  try {
    return await Promise.race([tal.speakToFile(text, fileUri), timeout])
  } catch {
    return null
  }
}

// Frågar om lov för taligenkänning och hämtar språkmodellen medan man
// pratar in, så att titeln hinner bli klar när man trycker Starta
export function prepareListening() {
  lyssna?.prepare()
}

// Lyssnar på en inspelning och ger texten, eller null om det inte gick -
// då får tjatet standardtiteln. Tolkningen sker bara i telefonen.
export async function transcribe(fileUri) {
  if (!lyssna) return null
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), LISTEN_TIMEOUT_MS))
  try {
    return await Promise.race([lyssna.transcribe(fileUri), timeout])
  } catch {
    return null
  }
}
