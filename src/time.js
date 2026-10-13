const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60

// "45s", "25m" eller "1h 30m"
export function formatDuration(totalSeconds) {
  if (totalSeconds < SECONDS_PER_MINUTE) return `${totalSeconds}s`

  const totalMinutes = Math.round(totalSeconds / SECONDS_PER_MINUTE)
  if (totalMinutes < MINUTES_PER_HOUR) return `${totalMinutes}m`

  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR)
  const minutes = totalMinutes % MINUTES_PER_HOUR
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`
}

// Nedräkning, t.ex. "9:07" eller "1:05:03"
export function formatCountdown(totalSeconds) {
  const safe = Math.max(0, totalSeconds)
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / SECONDS_PER_MINUTE)
  const seconds = safe % SECONDS_PER_MINUTE
  const pad = (value) => String(value).padStart(2, '0')

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`
}

// Klockslaget då tiden går ut, t.ex. "14:35"
export function clockTime(seconds) {
  return new Date(Date.now() + seconds * 1000).toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Var ett pågående tjat står just nu. Tiden härleds ur en fast sluttid i
// stället för att räknas ner, så att den stämmer även efter en stund i
// bakgrunden.
export function timerState(timer, now) {
  const secondsLeft = Math.max(0, Math.ceil((timer.endsAt - now) / 1000))
  return {
    secondsLeft,
    expired: secondsLeft === 0,
    // Förseningen räknas från första sluttiden - en snooze ger mer tid men
    // tar inte bort stämpeln
    late: now >= timer.deadline,
    lateSeconds: Math.max(0, Math.floor((now - timer.deadline) / 1000)),
  }
}

// Texten i timerns mitt: tid kvar, eller hur sent det är när tiden är ute
export function timerLabel(state) {
  return state.expired ? `+${formatCountdown(state.lateSeconds)}` : formatCountdown(state.secondsLeft)
}
