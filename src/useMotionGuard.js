import { useEffect, useRef, useState } from 'react'
import { Platform, Vibration } from 'react-native'
import { Accelerometer } from 'expo-sensors'

export const DISARM_HOLD_MS = 3000

const ARM_MS = 2250 // 3:an blinkar förbi, sen en sekund var på 2 och 1
const TICK_MS = 100
const SAMPLE_MS = 100
const MOVE_THRESHOLD = 0.18 // rörelse i g som räknas som upplockad
const RETURN_THRESHOLD = 0.08 // snävare, annars slår larmet av och på i kanten
const STILL_THRESHOLD = 0.03
const STILL_READINGS = 3
const FLAT = 0.9 // tyngdkraften drar rakt genom skärmen
// iOS tolkar mönstret som pauser mellan vibrationerna, Android som vänta/vibrera
const ALARM_PATTERN = Platform.OS === 'ios' ? [0, 1] : [0, 1000]

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}

// Rörelsevakten sparar telefonens läge på bordet och larmar om den flyttas.
// Fristående från tjat-timern och sparar ingenting.
// Faser: 'off' -> 'arming' -> 'watching' <-> 'alarm'
export function useMotionGuard() {
  const [phase, setPhase] = useState('off')
  const [armLeft, setArmLeft] = useState(Math.ceil(ARM_MS / 1000))
  const resting = useRef(null)
  const armEndsAt = useRef(0)

  // Räknar mot en fast sluttid, annars glider tiden iväg för varje steg
  useEffect(() => {
    if (phase !== 'arming') return
    const interval = setInterval(() => {
      const left = armEndsAt.current - Date.now()
      if (left > 0) return setArmLeft(Math.ceil(left / 1000))
      resting.current = null // första mätningen blir viloläget
      setPhase('watching')
    }, TICK_MS)
    return () => clearInterval(interval)
  }, [phase])

  // Mäter även under larmet, för att märka när telefonen lagts tillbaka
  useEffect(() => {
    if (phase !== 'watching' && phase !== 'alarm') return
    Accelerometer.setUpdateInterval(SAMPLE_MS)

    let previous = null
    let stillCount = 0

    const subscription = Accelerometer.addListener((reading) => {
      const jitter = previous ? distance(reading, previous) : 0
      previous = reading
      stillCount = jitter < STILL_THRESHOLD ? stillCount + 1 : 0

      if (phase === 'watching') {
        if (!resting.current) {
          resting.current = reading
          return
        }
        if (distance(reading, resting.current) > MOVE_THRESHOLD) setPhase('alarm')
        return
      }

      // Tillbaka i samma läge som förut, tyst direkt
      if (distance(reading, resting.current) < RETURN_THRESHOLD) {
        setPhase('watching')
        return
      }

      // Nedlagd i ett nytt läge: stilla och platt en stund ger nytt viloläge
      if (stillCount >= STILL_READINGS && Math.abs(reading.z) > FLAT) {
        resting.current = reading
        setPhase('watching')
      }
    })

    return () => subscription.remove()
  }, [phase])

  // Systemvibrationen är den kraftigaste en app får använda
  useEffect(() => {
    if (phase !== 'alarm') return
    Vibration.vibrate(ALARM_PATTERN, true)
    return () => Vibration.cancel()
  }, [phase])

  function arm() {
    armEndsAt.current = Date.now() + ARM_MS
    setArmLeft(Math.ceil(ARM_MS / 1000))
    setPhase('arming')
  }

  function disarm() {
    setPhase('off')
  }

  return { phase, armLeft, isOn: phase !== 'off', arm, disarm }
}
