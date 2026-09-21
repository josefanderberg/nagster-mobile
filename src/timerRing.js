// Uträkningarna bakom tidsratten. Ingen React och inget DOM här - bara matte,
// vilket gör dem lätta att läsa och att ändra utan att röra komponenten.

export const MINUTES_PER_LAP = 60
export const MAX_MINUTES = 8 * MINUTES_PER_LAP // åtta timmar räcker gott
export const SIZE = 220
export const RADIUS = 92
export const CENTER = SIZE / 2

const SEGMENTS_PER_LAP = 90 // ju fler, desto mjukare övergång
const TAIL_STRENGTH = 6 // hur mycket färg svansen har kvar från början, i procent
const RAMP = 3 // ju högre, desto längre håller sig ringen ljus innan den mättas

// Under en minut räknar ringen sekunder i stället för minuter, så att ett varv
// blir en minut. Det gör korta tider lätta att ställa in - och lätta att visa upp.
export const MIN_SECONDS = 1
const HALF_LAP = MINUTES_PER_LAP / 2

export function isSecondsMode(seconds) {
  return seconds < MINUTES_PER_LAP
}

// Ringens läge: sekunder i sekundläge, annars minuter
export function ringUnits(seconds) {
  return isSecondsMode(seconds) ? seconds : seconds / MINUTES_PER_LAP
}

export function clampMinutes(minutes) {
  return Math.min(MAX_MINUTES, Math.max(1, minutes))
}

// Punkten på ringen för ett visst läge. 0 är rakt upp. Medurs som standard,
// moturs i sekundläge så att de två enheterna går åt var sitt håll.
export function polar(units, mirrored = false) {
  const angle = (units / MINUTES_PER_LAP) * 2 * Math.PI * (mirrored ? -1 : 1)
  return [CENTER + RADIUS * Math.sin(angle), CENTER - RADIUS * Math.cos(angle)]
}

// Var på varvet pekaren befinner sig, 0-59
function pointToLapMinutes(clientX, clientY, rect, mirrored = false) {
  const dx = clientX - (rect.left + rect.width / 2)
  const dy = clientY - (rect.top + rect.height / 2)

  let degrees = (Math.atan2(mirrored ? -dx : dx, -dy) * 180) / Math.PI
  if (degrees < 0) degrees += 360

  return Math.round((degrees / 360) * MINUTES_PER_LAP) % MINUTES_PER_LAP
}

// Ny tid när pekaren flyttats, alltid i sekunder. Ett hopp på mer än ett halvt
// varv betyder att man passerat toppen: medurs läggs ett varv till, moturs dras
// ett bort. Vid toppen byter ringen dessutom mellan sekunder och minuter.
export function secondsFromPointer(currentSeconds, clientX, clientY, rect) {
  const next = pointToLapMinutes(clientX, clientY, rect)

  // Toppen är gränsen: därifrån går minuterna medurs och sekunderna moturs.
  // Passerar pekaren toppen byter ringen enhet och börjar om från början.
  if (isSecondsMode(currentSeconds)) {
    // Sekunderna går moturs, så pekaren läses av spegelvänt
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

// Svansen mättas efter vald tid, men inte linjärt: kurvan håller ringen ljus
// länge och färgar av sig snabbt mot slutet.
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

// Bågen ritas som många små segment med var sin färg: blek vid svansen, full
// färg vid handtaget. Segmenten får en styrka i procent som komponenten
// översätter till färg. Efter första varvet ritas alltid ett helt varv, så det är
// tonningen som vandrar runt i stället för att ringen töms.
// Färgerna är heltäckande (utblandade mot vitt) - vore de genomskinliga skulle
// överlappen mellan segmenten synas som ränder.
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
    // Segmenten överlappar rejält så att inga glipor syns
    const end = Math.min(start + size * 2.5, head)
    const progress = count === 1 ? 1 : index / (count - 1)
    const strength = tailStrength + (100 - tailStrength) * progress

    return {
      d: arcPath(start, end, mirrored),
      strength,
    }
  })
}
