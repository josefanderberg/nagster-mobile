import { useEffect, useRef, useState } from 'react'
import { Accelerometer } from 'expo-sensors'
import { setAudioModeAsync } from 'expo-audio'
import { playNag, startEscalatingBuzz } from './nag.js'

export const DISARM_HOLD_MS = 3000
export const SUSPICION_MS = 3000 // blått -> orange -> rött innan rösten drar igång

const ARM_MS = 2250 // 3:an blinkar förbi, sen en sekund var på 2 och 1
const TICK_MS = 100
const SAMPLE_MS = 100
const MOVE_THRESHOLD = 0.18 // rörelse i g som räknas som upplockad
const RETURN_THRESHOLD = 0.08 // snävare, annars slår larmet av och på i kanten
const STILL_THRESHOLD = 0.03
const STILL_READINGS = 3
const FLAT = 0.9 // tyngdkraften drar rakt genom skärmen
const FREE_MS = 2000 // så länge den gröna skärmen syns innan vakten släpper
const EARLY_MS = 1000 // så här tidigt före sluttiden räknas upplockningen som i tid

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}

// Rörelsevakten sparar telefonens läge på bordet och larmar om den flyttas.
// Sparar ingenting. alarmSoundUri är det aktiva tjatets lokala inspelning -
// finns den skäller den med i larmet. endsAt är tjatets sluttid: plockas
// mobilen upp när tiden är ute är man klar, och då blir skärmen grön i
// stället för röd.
// Faser: 'off' -> 'arming' -> 'watching' <-> 'alarm', eller 'watching' -> 'free' -> 'off'
export function useMotionGuard(alarmSoundUri, endsAt) {
  const [phase, setPhase] = useState('off')
  const [armLeft, setArmLeft] = useState(Math.ceil(ARM_MS / 1000))
  const resting = useRef(null)
  const armEndsAt = useRef(0)
  // Ref i stället för beroende, så att accelerometern inte startas om vid snooze
  const timerEndsAt = useRef(endsAt)
  timerEndsAt.current = endsAt

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
        if (distance(reading, resting.current) > MOVE_THRESHOLD) {
          const ends = timerEndsAt.current
          setPhase(ends && Date.now() >= ends - EARLY_MS ? 'free' : 'alarm')
        }
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

  // Tiden var ute när mobilen plockades upp: grönt en stund, sedan släpper
  // vakten så att man kan trycka Klart
  useEffect(() => {
    if (phase !== 'free') return
    const timeout = setTimeout(() => setPhase('off'), FREE_MS)
    return () => clearTimeout(timeout)
  }, [phase])

  // Vibrationen trappas upp exponentiellt tills mobilen ligger stilla igen.
  // Finns en inspelning skäller rösten med på maxvolym, även med ljudlös-
  // knappen på.
  useEffect(() => {
    if (phase !== 'alarm') return
    const stopBuzzing = startEscalatingBuzz()

    let stopVoice = null
    let cancelled = false
    // Rösten väntar tills skärmen hunnit bli röd
    const voiceTimer = setTimeout(() => {
      if (!alarmSoundUri) return
      setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'doNotMix' })
        .then(() => playNag(alarmSoundUri, 2)) // snooze 2 = maxvolym, lite gällare
        .then((stop) => {
          if (cancelled) stop()
          else stopVoice = stop
        })
        .catch(() => {}) // utan ljud larmar vibrationen ändå
    }, SUSPICION_MS)

    return () => {
      cancelled = true
      clearTimeout(voiceTimer)
      stopBuzzing()
      stopVoice?.()
    }
  }, [phase, alarmSoundUri])

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
