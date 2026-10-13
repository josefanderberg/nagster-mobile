import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useHoldToConfirm } from '../useHoldToConfirm.js'
import { SUSPICION_MS } from '../useMotionGuard.js'
import { timerLabel, timerState } from '../time.js'

const BLACK = '#000000'
const DIM = '#1c1c1e'
const BLUE = '#2f6fed'
const ORANGE = '#f08c00'
const RED = '#c1121f'
const GREEN = '#2e9e5b'
const WHITE = '#ffffff'
const FAINT = '#5a5a5e' // syns i mörkret utan att lysa upp rummet
const HINT_MS = 2500

// Vakten blir allt mer misstänksam: först kollar den bara läget, sedan
// blir den orolig och till sist skriker den. Lägger man ner mobilen börjar
// den om från början nästa gång.
const STAGES = [
  { heading: 'Hm?', sub: 'Vad gör du med mobilen?' },
  { heading: 'VAD HÅLLER\nDU PÅ MED?', sub: 'Lägg tillbaka den.' },
  { heading: 'LÄGG NED\nMOBILEN', sub: 'Lägg tillbaka den så tystnar larmet.' },
]

// Den tid som är kvar på tjatet som tar slut först, eller hur sent det är
function useTimeLeft(timer, active) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active || !timer) return
    setNow(Date.now())
    const interval = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(interval)
  }, [active, timer])
  return timer ? timerLabel(timerState(timer, now)) : null
}

// Larmets innehåll i valfri färg. Ritas två gånger, se nedan - bara den
// undre kopian tar emot tryck. Tiden står ovanför knapparna, så att man vet
// hur länge man har kvar. Går ett tjat kan man trycka Klar direkt, men att
// öppna appen kräver att man håller inne - där finns sedan Mer tid.
function AlarmContent({ color, stage, timeLeft, hasTimer, onDone, onHoldStart, onHoldEnd }) {
  return (
    <View style={styles.content}>
      <Text style={[styles.heading, { color }]}>{STAGES[stage].heading}</Text>
      <Text style={[styles.sub, { color }]}>{STAGES[stage].sub}</Text>
      {timeLeft && <Text style={[styles.alarmTime, { color }]}>{timeLeft}</Text>}
      <View style={styles.buttons}>
        {hasTimer && (
          <Pressable style={styles.done} onPress={onDone}>
            <Text style={styles.doneText}>Klar</Text>
          </Pressable>
        )}
        <Pressable style={[styles.hold, { borderColor: color }]} onPressIn={onHoldStart} onPressOut={onHoldEnd}>
          <Text style={[styles.holdText, { color }]}>{hasTimer ? 'Håll: öppna' : 'Håll: stäng av'}</Text>
        </Pressable>
      </View>
    </View>
  )
}

// Skärmen medan vakten är låst: svart normalt, färg vid larm. Ett enda modal-
// fönster med flera lägen, eftersom iOS kan krångla när en modal stängs
// samtidigt som en annan öppnas. Den svarta skärmen visar svagt hur lång tid
// som är kvar och stängs av genom att hålla inne i tre sekunder var som
// helst. Vid larm finns knappar: Klar, och håll för att öppna appen.
function GuardScreen({ phase, onDisarm, hasTimer, timer, onDone }) {
  const { width, height } = useWindowDimensions()
  const hold = useHoldToConfirm(onDisarm)
  const [hint, setHint] = useState(false)
  const hintTimer = useRef(null)

  const alarm = phase === 'alarm'
  const visible = phase === 'watching' || alarm
  const timeLeft = useTimeLeft(hasTimer ? timer : null, visible)

  // Färgen glider blått -> orange -> rött under misstänksamhetens sekunder
  const [stage, setStage] = useState(0)
  const suspicion = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!alarm) return
    setStage(0)
    suspicion.setValue(0)
    Animated.timing(suspicion, {
      toValue: 2,
      duration: SUSPICION_MS,
      easing: Easing.in(Easing.quad), // lugnt först, sedan allt snabbare
      useNativeDriver: false,
    }).start()
    const timers = [
      setTimeout(() => setStage(1), SUSPICION_MS / 2),
      setTimeout(() => setStage(2), SUSPICION_MS),
    ]
    return () => {
      suspicion.stopAnimation()
      timers.forEach(clearTimeout)
    }
  }, [alarm, suspicion])

  const alarmColor = suspicion.interpolate({ inputRange: [0, 1, 2], outputRange: [BLUE, ORANGE, RED] })

  useEffect(() => () => clearTimeout(hintTimer.current), [])

  function handlePressIn() {
    if (alarm) return // vid larm håller man på knappen, inte var som helst
    hold.startHold()
    // På den svarta skärmen syns en diskret ledtråd en stund när man rör den
    setHint(true)
    clearTimeout(hintTimer.current)
    hintTimer.current = setTimeout(() => setHint(false), HINT_MS)
  }

  const fillHeight = hold.fill.interpolate({ inputRange: [0, 1], outputRange: [0, height] })

  return (
    <Modal visible={visible} animationType="none" statusBarTranslucent>
      <StatusBar hidden />
      <Pressable
        style={{ width, height, backgroundColor: alarm ? 'transparent' : BLACK }}
        onPressIn={handlePressIn}
        onPressOut={hold.stopHold}
      >
        {alarm ? (
          <>
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: alarmColor }]} />
            {/* Vitt på färg underst, rött på vitt i fyllnaden som klipper */}
            <View style={[styles.layer, { height }]}>
              <AlarmContent
                color={WHITE}
                stage={stage}
                timeLeft={timeLeft}
                hasTimer={hasTimer}
                onDone={onDone}
                onHoldStart={hold.startHold}
                onHoldEnd={hold.stopHold}
              />
            </View>
            <Animated.View pointerEvents="none" style={[styles.fill, { height: fillHeight, backgroundColor: WHITE }]}>
              <View style={[styles.layer, { height }]}>
                <AlarmContent color={RED} stage={stage} timeLeft={timeLeft} hasTimer={hasTimer} />
              </View>
            </Animated.View>
          </>
        ) : (
          <>
            <Animated.View pointerEvents="none" style={[styles.fill, { height: fillHeight, backgroundColor: DIM }]} />
            <View pointerEvents="none" style={[styles.layer, styles.center, { height }]}>
              {timeLeft && (
                <>
                  <Text style={styles.timeLeft}>{timeLeft}</Text>
                  <Text style={styles.timeTitle} numberOfLines={1}>
                    {timer.task.title}
                  </Text>
                </>
              )}
              {hint && <Text style={styles.hint}>Håll inne i 3 sekunder för att låsa upp</Text>}
            </View>
          </>
        )}
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  // Lika hög som skärmen, så att båda kopiorna hamnar exakt ovanpå varandra
  layer: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  fill: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  heading: { fontSize: 46, fontWeight: '900', textAlign: 'center', lineHeight: 52 },
  sub: { fontSize: 16, textAlign: 'center' },
  alarmTime: { marginTop: 24, fontSize: 56, fontWeight: '300', fontVariant: ['tabular-nums'] },
  buttons: { marginTop: 8, flexDirection: 'row', gap: 12 },
  done: { backgroundColor: WHITE, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 28 },
  doneText: { color: GREEN, fontSize: 17, fontWeight: '800' },
  hold: { borderWidth: 2, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 22 },
  holdText: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  hint: { color: '#555', fontSize: 15, marginTop: 24 },
  timeLeft: { color: FAINT, fontSize: 72, fontWeight: '200', fontVariant: ['tabular-nums'] },
  timeTitle: { color: FAINT, fontSize: 15, marginTop: 4, paddingHorizontal: 40 },
})

export default GuardScreen
