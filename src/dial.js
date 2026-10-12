import * as Haptics from 'expo-haptics'
import { isSecondsMode, MIN_SECONDS, secondsFromPointer } from './timerRing.js'

// Ringen som ratt: ett klick för varje steg man snurrar, så att det känns hela
// tiden. Telefonen rapporterar fingret ungefär 60 gånger i sekunden, så snurrar
// man snabbt hinner ringen flytta flera steg mellan varje rapport - då blir
// klicket kraftigare, så att fart känns som mer vibration och inte mindre.
function click(previous, next) {
  const stepSize = isSecondsMode(previous) ? 1 : 60
  const steps = Math.abs(next - previous) / stepSize

  if (isSecondsMode(next) !== isSecondsMode(previous)) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid) // bytet vid toppen
  } else if (steps >= 4) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  } else if (steps >= 2) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  } else {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }
}

// Ny tid efter att fingret flyttats, med vibration om tiden ändrades
export function turnDial(seconds, x, y, rect) {
  const next = Math.max(MIN_SECONDS, secondsFromPointer(seconds, x, y, rect))
  if (next !== seconds) click(seconds, next)
  return next
}
