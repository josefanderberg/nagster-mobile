import { isSecondsMode } from './timerRing.js'

// Mer tid väljs på en rad: 1, 5 eller 10 minuter. Tjat under en minut får
// sekunder i stället, så att appen går att visa upp snabbt. Väljer man inget
// blir det två minuter efter en liten stund.
export const DEFAULT_SNOOZE_SECONDS = 120
export const CHOOSE_MS = 4000

export function snoozeChoices(durationSeconds) {
  const seconds = isSecondsMode(durationSeconds)
  return [1, 5, 10].map((amount) => ({
    label: seconds ? `${amount}s` : `${amount}m`,
    seconds: seconds ? amount : amount * 60,
  }))
}
