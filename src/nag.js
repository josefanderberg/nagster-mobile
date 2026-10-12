import { createAudioPlayer } from 'expo-audio'
import * as Speech from 'expo-speech'
import * as Haptics from 'expo-haptics'
import { Vibration } from 'react-native'
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

// Vibrationen trappas upp exponentiellt: glesa lätta stötar som blir allt
// tätare och hårdare, tills det efter runt tolv sekunder blir ett ihållande
// surr. Vaktens larm håller på tills mobilen ligger stilla igen.
const FIRST_PULSE_MS = 1500
const PULSE_FACTOR = 0.88 // varje paus är 88 % av den förra
const SHORTEST_PULSE_MS = 90

export function startEscalatingBuzz(maxMs = Infinity) {
  const started = Date.now()
  let pulse = 0
  let timer = null

  function next() {
    if (Date.now() - started > maxMs) return stop()
    const pause = FIRST_PULSE_MS * PULSE_FACTOR ** pulse
    if (pause < SHORTEST_PULSE_MS) {
      // Tätare än så känns inte stötarna isär - nu surrar den bara
      if (!startBuzz()) Vibration.vibrate([0, 1], true)
      if (maxMs !== Infinity) timer = setTimeout(stop, maxMs - (Date.now() - started))
      return
    }
    const style =
      pulse < 5
        ? Haptics.ImpactFeedbackStyle.Light
        : pulse < 12
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Heavy
    Haptics.impactAsync(style)
    pulse += 1
    timer = setTimeout(next, pause)
  }

  function stop() {
    clearTimeout(timer)
    stopBuzz()
    Vibration.cancel()
  }

  next()
  return stop
}
