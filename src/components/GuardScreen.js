import { useEffect, useRef, useState } from 'react'
import { Animated, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useHoldToConfirm } from '../useHoldToConfirm.js'

const BLACK = '#000000'
const DIM = '#1c1c1e'
const RED = '#c1121f'
const WHITE = '#ffffff'
const HINT_MS = 2500

// Larmets innehåll i valfri färg. Ritas två gånger, se nedan.
function AlarmContent({ color }) {
  return (
    <View style={styles.content}>
      <Text style={[styles.heading, { color }]}>LÄGG NED{'\n'}MOBILEN</Text>
      <Text style={[styles.sub, { color }]}>Lägg tillbaka den så tystnar larmet.</Text>
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
  const visible = phase === 'watching' || alarm

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
        style={{ width, height, backgroundColor: alarm ? RED : BLACK }}
        onPressIn={handlePressIn}
        onPressOut={hold.stopHold}
      >
        {alarm ? (
          <>
            {/* Vitt på rött underst, rött på vitt i fyllnaden som klipper */}
            <View style={[styles.layer, { height }]}>
              <AlarmContent color={WHITE} />
            </View>
            <Animated.View pointerEvents="none" style={[styles.fill, { height: fillHeight, backgroundColor: WHITE }]}>
              <View style={[styles.layer, { height }]}>
                <AlarmContent color={RED} />
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
