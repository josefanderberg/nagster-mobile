import { createAudioPlayer } from 'expo-audio'

// Tjatmotorn – samma eskaleringsformel som i webbappen:
// snabbare, gällare, högre och fler repetitioner för varje snooze.
export function playNag(source, snoozeCount) {
  const player = createAudioPlayer(source)

  player.shouldCorrectPitch = false // pitchen följer hastigheten → panikröst
  player.playbackRate = Math.min(1 + snoozeCount * 0.25, 2.5)
  player.volume = Math.min(0.7 + snoozeCount * 0.15, 1)

  const repeats = Math.min(1 + snoozeCount * 2, 7)
  let played = 0

  const subscription = player.addListener('playbackStatusUpdate', (status) => {
    if (!status.didJustFinish) return
    played += 1
    if (played < repeats) {
      player.seekTo(0)
      player.play()
    }
  })

  player.play()

  return {
    stop() {
      subscription.remove()
      player.pause()
      player.remove()
    },
  }
}
