// Uträkningarna bakom tidsringen. Ingen React och inget DOM, bara matte.

export const MINUTES_PER_LAP = 60
export const MAX_MINUTES = 8 * MINUTES_PER_LAP // åtta timmar räcker gott
export const SIZE = 220
export const RADIUS = 92
export const CENTER = SIZE / 2

const SEGMENTS_PER_LAP = 90
const TAIL_STRENGTH = 6 // svansens färg i procent
const RAMP = 3 // högre värde håller ringen ljus längre

export const MIN_SECONDS = 1
const HALF_LAP = MINUTES_PER_LAP / 2

export function isSecondsMode(seconds) {
  return seconds < MINUTES_PER_LAP
}

export function ringUnits(seconds) {
  return isSecondsMode(seconds) ? seconds : seconds / MINUTES_PER_LAP
}

export function clampMinutes(minutes) {
  return Math.min(MAX_MINUTES, Math.max(1, minutes))
}

// 0 är rakt upp. Medurs för minuter, moturs för sekunder.
export function polar(units, mirrored = false) {
  const angle = (units / MINUTES_PER_LAP) * 2 * Math.PI * (mirrored ? -1 : 1)
  return [CENTER + RADIUS * Math.sin(angle), CENTER - RADIUS * Math.cos(angle)]
}

function pointToLapMinutes(clientX, clientY, rect, mirrored = false) {
  const dx = clientX - (rect.left + rect.width / 2)
  const dy = clientY - (rect.top + rect.height / 2)

  let degrees = (Math.atan2(mirrored ? -dx : dx, -dy) * 180) / Math.PI
  if (degrees < 0) degrees += 360

  return Math.round((degrees / 360) * MINUTES_PER_LAP) % MINUTES_PER_LAP
}

// Ny tid i sekunder. Ett hopp på mer än ett halvt varv betyder att pekaren
// passerat toppen, och där byter ringen också mellan sekunder och minuter.
export function secondsFromPointer(currentSeconds, clientX, clientY, rect) {
  const next = pointToLapMinutes(clientX, clientY, rect)

  if (isSecondsMode(currentSeconds)) {
    const mirrored = pointToLapMinutes(clientX, clientY, rect, true)
    if (Math.abs(mirrored - currentSeconds) > HALF_LAP) return MINUTES_PER_LAP // = 1 minut
    return Math.min(MINUTES_PER_LAP - 1, Math.max(MIN_SECONDS, mirrored))
  }

  const minutes = currentSeconds / MINUTES_PER_LAP
  const previous = minutes % MINUTES_PER_LAP
  let laps = Math.floor(minutes / MINUTES_PER_LAP)

  const step = next - previous
  if (step < -HALF_LAP) laps += 1
  else if (step > HALF_LAP) laps -= 1

  const total = laps * MINUTES_PER_LAP + next

  // Moturs förbi toppen från första minuten → ner i sekunder, spegelvänt
  if (total < 1) {
    const mirrored = pointToLapMinutes(clientX, clientY, rect, true)
    return Math.min(MINUTES_PER_LAP - 1, Math.max(MIN_SECONDS, mirrored))
  }

  return Math.min(MAX_MINUTES, total) * MINUTES_PER_LAP
}

// Inte linjärt: ringen håller sig ljus länge och mättas snabbt mot slutet.
function tailStrengthFor(minutes) {
  const progress = Math.min(1, minutes / MAX_MINUTES)
  return TAIL_STRENGTH + (100 - TAIL_STRENGTH) * progress ** RAMP
}

function arcPath(fromUnits, toUnits, mirrored) {
  const [x1, y1] = polar(fromUnits, mirrored)
  const [x2, y2] = polar(toUnits, mirrored)
  const largeArc = toUnits - fromUnits > MINUTES_PER_LAP / 2 ? 1 : 0
  const sweep = mirrored ? 0 : 1
  return `M ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${largeArc} ${sweep} ${x2} ${y2}`
}

// Bågen ritas som många små segment: blek vid svansen, full färg vid handtaget.
// Varje segment får en styrka i procent som komponenten översätter till färg.
// Efter första varvet ritas alltid ett helt varv, så tonningen vandrar runt.
export function arcSegments(minutes, mirrored = false) {
  const lapMinutes = minutes % MINUTES_PER_LAP
  const laps = Math.floor(minutes / MINUTES_PER_LAP)

  const head = laps === 0 ? lapMinutes : lapMinutes + MINUTES_PER_LAP
  const sweep = laps === 0 ? lapMinutes : MINUTES_PER_LAP
  const tailStrength = tailStrengthFor(minutes)

  const count = Math.max(1, Math.round((sweep / MINUTES_PER_LAP) * SEGMENTS_PER_LAP))
  const size = sweep / count

  return Array.from({ length: count }, (_, index) => {
    const start = head - sweep + index * size
    const end = Math.min(start + size * 2.5, head)
    const progress = count === 1 ? 1 : index / (count - 1)
    const strength = tailStrength + (100 - tailStrength) * progress

    return {
      d: arcPath(start, end, mirrored),
      strength,
    }
  })
}
