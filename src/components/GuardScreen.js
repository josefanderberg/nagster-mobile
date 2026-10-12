import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useHoldToConfirm } from '../useHoldToConfirm.js'
import { SUSPICION_MS } from '../useMotionGuard.js'

const BLACK = '#000000'
const DIM = '#1c1c1e'
const BLUE = '#2f6fed'
const ORANGE = '#f08c00'
const RED = '#c1121f'
const GREEN = '#2e9e5b'
const WHITE = '#ffffff'
const HINT_MS = 2500

// Vakten blir allt mer misstänksam: först kollar den bara läget, sedan
// blir den orolig och till sist skriker den. Lägger man ner mobilen börjar
// den om från början nästa gång.
const STAGES = [
  { heading: 'Hm?', sub: 'Vad gör du med mobilen?' },
  { heading: 'VAD HÅLLER\nDU PÅ MED?', sub: 'Lägg tillbaka den.' },
  { heading: 'LÄGG NED\nMOBILEN', sub: 'Lägg tillbaka den så tystnar larmet.' },
]

// Larmets innehåll i valfri färg. Ritas två gånger, se nedan.
function AlarmContent({ color, stage }) {
  return (
    <View style={styles.content}>
      <Text style={[styles.heading, { color }]}>{STAGES[stage].heading}</Text>
      <Text style={[styles.sub, { color }]}>{STAGES[stage].sub}</Text>
      <View style={[styles.hold, { borderColor: color }]}>
        <Text style={[styles.holdText, { color }]}>Håll inne i 3 sekunder för att stänga av vakten</Text>
      </View>
    </View>
  )
}

// Skärmen medan vakten är låst: svart normalt, röd vid larm. Ett enda modal-
// fönster med två lägen, eftersom iOS kan krångla när en modal stängs samtidigt
// som en annan öppnas. Stängs av genom att hålla inne i tre sekunder.
function GuardScreen({ phase, onDisarm }) {
  const { width, height } = useWindowDimensions()
  const hold = useHoldToConfirm(onDisarm)
  const [hint, setHint] = useState(false)
  const hintTimer = useRef(null)

  const alarm = phase === 'alarm'
  const free = phase === 'free' // tiden var ute när mobilen plockades upp
  const visible = phase === 'watching' || alarm || free

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
    hold.startHold()
    // På den svarta skärmen syns en diskret ledtråd en stund när man rör den
    if (!alarm) {
      setHint(true)
      clearTimeout(hintTimer.current)
      hintTimer.current = setTimeout(() => setHint(false), HINT_MS)
    }
  }

  const fillHeight = hold.fill.interpolate({ inputRange: [0, 1], outputRange: [0, height] })

  return (
    <Modal visible={visible} animationType="none" statusBarTranslucent>
      <StatusBar hidden />
      <Pressable
        style={{ width, height, backgroundColor: alarm ? 'transparent' : free ? GREEN : BLACK }}
        onPressIn={handlePressIn}
        onPressOut={hold.stopHold}
      >
        {free ? (
          <View style={[styles.layer, { height }]}>
            <View style={styles.content}>
              <Text style={[styles.heading, { color: WHITE }]}>SNYGGT!</Text>
              <Text style={[styles.sub, { color: WHITE }]}>Tiden är ute - nu får du ta upp mobilen.</Text>
            </View>
          </View>
        ) : alarm ? (
          <>
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: alarmColor }]} />
            {/* Vitt på färg underst, rött på vitt i fyllnaden som klipper */}
            <View style={[styles.layer, { height }]}>
              <AlarmContent color={WHITE} stage={stage} />
            </View>
            <Animated.View pointerEvents="none" style={[styles.fill, { height: fillHeight, backgroundColor: WHITE }]}>
              <View style={[styles.layer, { height }]}>
                <AlarmContent color={RED} stage={stage} />
              </View>
            </Animated.View>
          </>
        ) : (
          <>
            <Animated.View pointerEvents="none" style={[styles.fill, { height: fillHeight, backgroundColor: DIM }]} />
            {hint && (
              <View pointerEvents="none" style={[styles.layer, styles.center, { height }]}>
                <Text style={styles.hint}>Håll inne i 3 sekunder för att låsa upp</Text>
              </View>
            )}
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
  hold: { marginTop: 32, borderWidth: 2, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 24 },
  holdText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  hint: { color: '#555', fontSize: 15 },
})

export default GuardScreen
