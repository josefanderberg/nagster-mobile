import { useEffect, useRef, useState } from 'react'
import { Platform, Vibration } from 'react-native'
import { Accelerometer } from 'expo-sensors'

const FLASH_MS = 250 // hur länge 3:an syns innan nedräkningen går vidare till 2
// Siffran avrundas uppåt, så 3:an syns bara den första kvartssekunden –
// sen tar 2 och 1 en hel sekund var
const ARM_MS = 2000 + FLASH_MS
const TICK_MS = 100 // hur ofta nedräkningen kollar klockan
const SAMPLE_MS = 100 // hur ofta accelerometern läses av
const MOVE_THRESHOLD = 0.18 // rörelse (i g) från viloläget som räknas som upplockad
const RETURN_THRESHOLD = 0.08 // så nära viloläget räknas som tillbakalagd
const STILL_THRESHOLD = 0.03 // skakning (i g) som fortfarande räknas som stilla
const STILL_READINGS = 3 // stilla mätningar i rad för att godta ett nytt viloläge
const FLAT = 0.9 // ligger platt när tyngdkraften nästan helt drar rakt genom skärmen
// Systemvibrationen är den kraftigaste en app får använda. På iOS varar den
// alltid ungefär 400 ms och mönstret är pauserna emellan – därför nästan inga
// pauser alls. På Android är mönstret vänta/vibrera, så där en lång vibration.
const ALARM_PATTERN = Platform.OS === 'ios' ? [0, 1] : [0, 1000]

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
  const [armLeft, setArmLeft] = useState(Math.ceil(ARM_MS / 1000))
  const resting = useRef(null)
  const armEndsAt = useRef(0)

  // Nedräkningen innan vakten låser. Den räknar från en fast sluttid i stället
  // för att räkna ner steg för steg – annars blir varje steg lite för långt och
  // tiden glider iväg. Siffran byter exakt på varje hel sekund.
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

  // Larmet: systemvibrationen i så tät följd som telefonen tillåter. Bara den –
  // de haptiska stötarna är svagare, och två vibrationer i olika takt glider i
  // och ur fas så att det känns som vågor.
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
