import { createAudioPlayer } from 'expo-audio'
import * as Speech from 'expo-speech'
import * as Haptics from 'expo-haptics'
import { Platform, Vibration } from 'react-native'
import { startBuzz, stopBuzz } from '../modules/tjat-native/index.js'

const MAX_MILLISECONDS = 30_000 // tjatet ger sig efter en halv minut

// Tjatmotorn: rösten loopar tills man snoozar eller är klar, men aldrig
// längre än en halv minut. För varje snooze blir den snabbare och gällare.
export async function playNag(source, snoozeCount) {
  const player = createAudioPlayer(source)

  // playbackRate går bara att läsa i expo-audio - hastigheten sätts med
  // setPlaybackRate. Utan tonhöjdskorrigering följer tonhöjden med, så rösten
  // blir gällare. iOS tar som mest dubbel hastighet.
  player.shouldCorrectPitch = false
  player.setPlaybackRate(Math.min(1 + snoozeCount * 0.25, 2))
  player.volume = Math.min(0.6 + snoozeCount * 0.2, 1)
  player.loop = true
  player.play()

  const timeout = setTimeout(stop, MAX_MILLISECONDS)

  function stop() {
    clearTimeout(timeout)
    player.pause()
    player.remove()
  }

  return stop
}

// Lyssna på ett tjat i listan: en gång, i normal takt. Ett nytt långt tryck
// avbryter det som spelas. Utan ljudfil läser telefonens röst upp titeln.
let previewPlayer = null

export function previewNag(source, text) {
  previewPlayer?.remove()
  previewPlayer = null
  Speech.stop()
  if (!source) return Speech.speak(text)

  const player = createAudioPlayer(source)
  previewPlayer = player
  const subscription = player.addListener('playbackStatusUpdate', (status) => {
    if (!status.didJustFinish) return
    subscription.remove()
    player.remove()
    if (previewPlayer === player) previewPlayer = null
  })
  player.play()
}

// Utan ljudfil (Android, eller om iPhonens röstfil inte gick att skapa) läser
// telefonens röst upp tjatet direkt - på telefonens språk, och snabbare och
// ljusare för varje snooze, precis som en inspelning.
export async function speakNag(text, snoozeCount) {
  let stopped = false
  const options = {
    rate: Math.min(1 + snoozeCount * 0.25, 2),
    pitch: Math.min(1 + snoozeCount * 0.2, 2),
    onDone: () => {
      if (!stopped) Speech.speak(text, options)
    },
  }
  Speech.speak(text, options)

  const timeout = setTimeout(stop, MAX_MILLISECONDS)

  function stop() {
    stopped = true
    clearTimeout(timeout)
    Speech.stop()
  }

  return stop
}

// Vaktens larm vibrerar för fullt direkt: en kraftig varningsstöt och sedan
// systemvibrationen i loop, med Core Haptics surr ovanpå. På vissa telefoner
// känns bara systemvibrationen, så den får aldrig hoppas över. Larmet håller
// på tills mobilen ligger stilla igen.
// iOS tolkar mönstret som pauser mellan vibrationerna, Android som vänta/vibrera
const VIBRATION_LOOP = Platform.OS === 'ios' ? [0, 1] : [0, 1000]

export function startAlarmBuzz() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
  Vibration.vibrate(VIBRATION_LOOP, true)
  startBuzz()

  return function stop() {
    stopBuzz()
    Vibration.cancel()
  }
}
