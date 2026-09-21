import { useEffect, useRef, useState } from 'react'
import { Platform, Vibration } from 'react-native'
import { Accelerometer } from 'expo-sensors'
import * as Haptics from 'expo-haptics'

const ARM_SECONDS = 5 // tid att lägga ner telefonen innan vakten låser
const SAMPLE_MS = 100 // hur ofta accelerometern läses av
const MOVE_THRESHOLD = 0.18 // rörelse (i g) från viloläget som räknas som upplockad
const RETURN_THRESHOLD = 0.08 // så nära viloläget räknas som tillbakalagd
const STILL_THRESHOLD = 0.03 // skakning (i g) som fortfarande räknas som stilla
const STILL_READINGS = 3 // stilla mätningar i rad för att godta ett nytt viloläge
const FLAT = 0.9 // ligger platt när tyngdkraften nästan helt drar rakt genom skärmen
const HAPTIC_MS = 35 // så tätt att stötarna flyter ihop till ett jämnt surr

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}

// Rörelsevakten: när telefonen ligger still på bordet sparas dess läge. Rör man
// den därifrån går larmet – och lägger man ner den igen tystnar det direkt.
// Det är det som gör Tjat till en mobilapp: en webbläsare har varken
// accelerometer eller vibration.
//
// Vakten är fristående från tjat-timern: den sparar ingenting och kan köras
// ensam, eller samtidigt som ett tjat räknar ner.
//
// Faser: 'off' → 'arming' (nedräkning) → 'watching' ⇄ 'alarm'
export function useMotionGuard() {
  const [phase, setPhase] = useState('off')
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

      // Tillbaka i samma läge som förut → tyst direkt, redan vid första mätningen.
      // Gränsen är snävare än för att larma, så att det inte slår av och på i kanten.
      if (distance(reading, resting.current) < RETURN_THRESHOLD) {
        setPhase('watching')
        return
      }

      // Nedlagd i ett nytt läge (till exempel på en annan plats) – ligger den
      // stilla och platt en kort stund blir det nya läget viloläget
      if (stillCount >= STILL_READINGS && Math.abs(reading.z) > FLAT) {
        resting.current = reading
        setPhase('watching')
      }
    })

    return () => subscription.remove()
  }, [phase])

  // Larmet: så konstant och hårt som telefonen tillåter, med en enda mekanism
  // i jämn takt. Två vibrationer i olika takt glider i och ur fas och känns som
  // vågor – därför aldrig båda samtidigt.
  useEffect(() => {
    if (phase !== 'alarm') return

    // Android kan vibrera oavbrutet: en lång vibration som upprepas
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 1000], true)
      return () => Vibration.cancel()
    }

    // iOS låter inte appar vibrera oavbrutet. Närmast kommer täta, kraftiga
    // haptiska stötar – så täta att de flyter ihop till ett surr.
    const interval = setInterval(
      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
      HAPTIC_MS
    )
    return () => clearInterval(interval)
  }, [phase])

  function arm() {
    setArmLeft(ARM_SECONDS)
    setPhase('arming')
  }

  function disarm() {
    setPhase('off')
  }

  return { phase, armLeft, isOn: phase !== 'off', arm, disarm }
}
