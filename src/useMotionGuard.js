import { useEffect, useRef, useState } from 'react'
import { Vibration } from 'react-native'
import { Accelerometer } from 'expo-sensors'
import * as Haptics from 'expo-haptics'

const ARM_SECONDS = 5 // tid att lägga ner telefonen innan vakten låser
const MOVE_THRESHOLD = 0.18 // hur stor rörelse (i g) som räknas som att den plockats upp
const BUZZ_INTERVAL = 600 // ms mellan vibrationerna i larmet

// Rörelsevakten: när telefonen ligger still på bordet sparas dess läge. Rör man
// den därifrån går larmet – det som gör Tjat till en mobilapp, eftersom en
// webbläsare varken har accelerometer eller vibration.
//
// Faser: 'off' → 'arming' (nedräkning) → 'watching' → 'alarm'
export function useMotionGuard(enabled) {
  const [phase, setPhase] = useState(enabled ? 'arming' : 'off')
  const [armLeft, setArmLeft] = useState(ARM_SECONDS)
  const resting = useRef(null)

  // Nedräkningen innan vakten låser
  useEffect(() => {
    if (phase !== 'arming') return
    const timeout = setTimeout(() => {
      if (armLeft <= 1) setPhase('watching')
      else setArmLeft((left) => left - 1)
    }, 1000)
    return () => clearTimeout(timeout)
  }, [phase, armLeft])

  // Vaktar: första mätningen är telefonens viloläge, sen jämförs varje mätning mot den
  useEffect(() => {
    if (phase !== 'watching') return
    resting.current = null
    Accelerometer.setUpdateInterval(150)

    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      if (!resting.current) {
        resting.current = { x, y, z }
        return
      }
      const moved = Math.hypot(x - resting.current.x, y - resting.current.y, z - resting.current.z)
      if (moved > MOVE_THRESHOLD) setPhase('alarm')
    })

    return () => subscription.remove()
  }, [phase])

  // Larmet: ihållande vibration tills det stängs av
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
