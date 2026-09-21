import { createAudioPlayer } from 'expo-audio'

const MAX_MILLISECONDS = 30_000 // tjatet ger sig efter en halv minut

// Tjatmotorn: rösten loopar tills man snoozar eller är klar, men aldrig
// längre än en halv minut. För varje snooze blir den snabbare och gällare.
export async function playNag(source, snoozeCount) {
  const player = createAudioPlayer(source)

  player.shouldCorrectPitch = false // tonhöjden följer hastigheten
  player.playbackRate = Math.min(1 + snoozeCount * 0.25, 2.5)
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
