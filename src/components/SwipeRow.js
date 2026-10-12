import { useRef } from 'react'
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { colors } from '../theme.js'

const TRIGGER = 90 // så långt man måste svepa för att något ska hända
const MAX = 140
const RESIST = 0.15 // åt ett håll som inte gör något känns kortet segt

// Svep på ett kort i listan: höger kör tjatet igen, vänster tar bort det.
// Under kortet syns vad som händer, och ett klick i fingret när man svept
// tillräckligt långt. En handling som saknas (null) gör det hållet segt.
// Byggt på React Natives PanResponder, så inget extra native-bibliotek behövs.
function SwipeRow({ children, onSwipeRight, onSwipeLeft }) {
  const x = useRef(new Animated.Value(0)).current
  const passed = useRef(false)
  // PanResponder skapas en gång - de senaste handlingarna läses via en ref
  const actions = useRef({ onSwipeRight, onSwipeLeft })
  actions.current = { onSwipeRight, onSwipeLeft }

  function settle() {
    passed.current = false
    Animated.spring(x, { toValue: 0, useNativeDriver: true }).start()
  }

  const responder = useRef(
    PanResponder.create({
      // Capture, så att svepet tar över från kortets tryck - men bara när
      // fingret tydligt rör sig i sidled, annars får listan rulla
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, gesture) => {
        const { onSwipeRight, onSwipeLeft } = actions.current
        let dx = gesture.dx
        if ((dx > 0 && !onSwipeRight) || (dx < 0 && !onSwipeLeft)) dx *= RESIST
        dx = Math.max(-MAX, Math.min(MAX, dx))
        x.setValue(dx)

        const over = Math.abs(dx) >= TRIGGER
        if (over && !passed.current) Haptics.selectionAsync()
        passed.current = over
      },
      onPanResponderRelease: (_, gesture) => {
        const { onSwipeRight, onSwipeLeft } = actions.current
        if (gesture.dx >= TRIGGER && onSwipeRight) onSwipeRight()
        else if (gesture.dx <= -TRIGGER && onSwipeLeft) onSwipeLeft()
        settle()
      },
      onPanResponderTerminate: settle,
    })
  ).current

  const runOpacity = x.interpolate({ inputRange: [0, TRIGGER], outputRange: [0, 1], extrapolate: 'clamp' })
  const removeOpacity = x.interpolate({ inputRange: [-TRIGGER, 0], outputRange: [1, 0], extrapolate: 'clamp' })

  return (
    <View>
      <View style={styles.under}>
        <Animated.View style={[styles.action, styles.run, { opacity: runOpacity }]}>
          <Text style={styles.actionText}>Kör igen</Text>
        </Animated.View>
        <Animated.View style={[styles.action, styles.remove, { opacity: removeOpacity }]}>
          <Text style={[styles.actionText, styles.right]}>Ta bort</Text>
        </Animated.View>
      </View>
      <Animated.View style={{ transform: [{ translateX: x }] }} {...responder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  // absoluteFillObject finns inte längre i React Native - därför utskrivet
  under: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, flexDirection: 'row', borderRadius: 14, overflow: 'hidden' },
  action: { flex: 1, justifyContent: 'center', paddingHorizontal: 18 },
  run: { backgroundColor: colors.ok },
  remove: { backgroundColor: colors.accentDark },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  right: { textAlign: 'right' },
})

export default SwipeRow
