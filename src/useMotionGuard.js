import { useEffect, useRef, useState } from 'react'
import { Vibration } from 'react-native'
import { Accelerometer } from 'expo-sensors'
import * as Haptics from 'expo-haptics'

const ARM_SECONDS = 5 // tid att lägga ner telefonen innan vakten låser
const SAMPLE_MS = 150 // hur ofta accelerometern läses av
const MOVE_THRESHOLD = 0.18 // rörelse (i g) som räknas som att den plockats upp
const STILL_THRESHOLD = 0.03 // skakning (i g) som fortfarande räknas som stilla
const STILL_READINGS = 7 // så många stilla mätningar i rad (≈ 1 sekund) = nedlagd
const FLAT = 0.9 // ligger platt när tyngdkraften nästan helt drar rakt genom skärmen
const BUZZ_INTERVAL = 600 // ms mellan vibrationerna i larmet

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}

// Rörelsevakten: när telefonen ligger still på bordet sparas dess läge. Rör man
// den därifrån går larmet – och lägger man ner den igen tystnar det av sig
// självt. Det är det som gör Tjat till en mobilapp: en webbläsare har varken
// accelerometer eller vibration.
//
// Faser: 'off' → 'arming' (nedräkning) → 'watching' ⇄ 'alarm'
export function useMotionGuard(enabled) {
  const [phase, setPhase] = useState(enabled ? 'arming' : 'off')
  const [armLeft, setArmLeft] = useState(ARM_SECONDS)
  const resting = useRef(null)

  // Nedräkningen innan vakten låser
  useEffect(() => {
    if (phase !== 'arming') return
    const timeout = setTimeout(() => {
      if (armLeft > 1) return setArmLeft((left) => left - 1)
      resting.current = null // första mätningen blir viloläget
      setPhase('watching')
    }, 1000)
    return () => clearTimeout(timeout)
  }, [phase, armLeft])

  // Mäter hela tiden medan vakten är på – även under larmet, för att märka
  // när telefonen lagts tillbaka
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

      // Larm: stilla en stund och platt mot bordet = nedlagd igen.
      // Det nya läget blir viloläget, så den får gärna ligga lite annorlunda.
      if (stillCount >= STILL_READINGS && Math.abs(reading.z) > FLAT) {
        resting.current = reading
        setPhase('watching')
      }
    })

    return () => subscription.remove()
  }, [phase])

  // Larmet: ihållande vibration tills telefonen läggs ner eller vakten stängs av
  useEffect(() => {
    if (phase !== 'alarm') return
    const buzz = () => {
      Vibration.vibrate(400)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    }
    buzz()
    const interval = setInterval(buzz, BUZZ_INTERVAL)

    return () => {
      clearInterval(interval)
      Vibration.cancel()
    }
  }, [phase])

  // Stänger av vakten för resten av tjatet
  function disarm() {
    setPhase('off')
  }

  return { phase, armLeft, disarm }
}
