import { useEffect, useRef, useState } from 'react'
import { Accelerometer, Gyroscope } from 'expo-sensors'
import { setAudioModeAsync } from 'expo-audio'
import { playNag, startAlarmBuzz } from './nag.js'

export const DISARM_HOLD_MS = 3000
export const SUSPICION_MS = 3000 // blått -> orange -> rött innan rösten drar igång

const ARM_MS = 2250 // 3:an blinkar förbi, sen en sekund var på 2 och 1
const TICK_MS = 100
const SAMPLE_MS = 100
const MOVE_THRESHOLD = 0.1 // lutning i g som räknas som upplockad, ungefär fem grader
const TURN_THRESHOLD = 0.6 // vridning i rad/s - man vrider alltid mobilen lite när man tar i den
const RETURN_THRESHOLD = 0.08 // tillbaka i samma läge som förut
const STILL_THRESHOLD = 0.03
const STILL_READINGS = 10 // en hel sekund stilla innan larmet tystnar
const MIN_ALARM_MS = 2500 // larmet hinner kännas ordentligt även om man släpper direkt
const FLAT = 0.9 // tyngdkraften drar rakt genom skärmen
const EARLY_MS = 1000 // så här tidigt före sluttiden räknas upplockningen som i tid

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}

// Rörelsevakten sparar telefonens läge på bordet och larmar om den flyttas.
// Sparar ingenting. alarmSoundUri är det aktiva tjatets lokala inspelning -
// finns den skäller den med i larmet. endsAt är tjatets sluttid: plockas
// mobilen upp när tiden är ute släpper vakten direkt, så att man kommer
// till Klart och Snooza - det är inte säkert att man är klar bara för att
// tiden gått.
// Faser: 'off' -> 'arming' -> 'watching' <-> 'alarm', eller 'watching' -> 'off'
export function useMotionGuard(alarmSoundUri, endsAt) {
  const [phase, setPhase] = useState('off')
  const [armLeft, setArmLeft] = useState(Math.ceil(ARM_MS / 1000))
  const resting = useRef(null)
  const armEndsAt = useRef(0)
  const alarmSince = useRef(0)
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

  // Mäter även under larmet, för att märka när telefonen lagts tillbaka.
  // Accelerometern känner lutning och gyroskopet vridning - tillsammans
  // märker de nästan alla sätt att ta i mobilen.
  useEffect(() => {
    if (phase !== 'watching' && phase !== 'alarm') return
    Accelerometer.setUpdateInterval(SAMPLE_MS)
    Gyroscope.setUpdateInterval(SAMPLE_MS)

    let previous = null
    let stillCount = 0

    // Upplockad: tiden ute släpper vakten, annars larm
    function pickedUp() {
      const ends = timerEndsAt.current
      if (ends && Date.now() >= ends - EARLY_MS) return setPhase('off')
      alarmSince.current = Date.now()
      setPhase('alarm')
    }

    const tilt = Accelerometer.addListener((reading) => {
      const jitter = previous ? distance(reading, previous) : 0
      previous = reading
      stillCount = jitter < STILL_THRESHOLD ? stillCount + 1 : 0

      if (phase === 'watching') {
        if (!resting.current) {
          resting.current = reading
          return
        }
        if (distance(reading, resting.current) > MOVE_THRESHOLD) pickedUp()
        return
      }

      // Larmet får alltid hålla på en stund, och tystnar först när mobilen
      // legat stilla en sekund - i samma läge som förut eller platt i ett nytt
      if (Date.now() - alarmSince.current < MIN_ALARM_MS || stillCount < STILL_READINGS) return
      if (distance(reading, resting.current) < RETURN_THRESHOLD) {
        setPhase('watching')
      } else if (Math.abs(reading.z) > FLAT) {
        resting.current = reading
        setPhase('watching')
      }
    })

    const turn = Gyroscope.addListener(({ x, y, z }) => {
      if (phase === 'watching' && resting.current && Math.hypot(x, y, z) > TURN_THRESHOLD) pickedUp()
    })

    return () => {
      tilt.remove()
      turn.remove()
    }
  }, [phase])

  // Vibrationen går för fullt tills mobilen ligger stilla igen.
  // Finns en inspelning skäller rösten med på maxvolym, även med ljudlös-
  // knappen på.
  useEffect(() => {
    if (phase !== 'alarm') return
    const stopBuzzing = startAlarmBuzz()

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
