const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60

// "45s", "25m" eller "1h 30m" – samma format som webbappen
export function formatDuration(totalSeconds) {
  if (totalSeconds < SECONDS_PER_MINUTE) return `${totalSeconds}s`

  const totalMinutes = Math.round(totalSeconds / SECONDS_PER_MINUTE)
  if (totalMinutes < MINUTES_PER_HOUR) return `${totalMinutes}m`

  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR)
  const minutes = totalMinutes % MINUTES_PER_HOUR
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`
}
