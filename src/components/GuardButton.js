import { useRef } from 'react'
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native'
import { LockIcon } from './icons.js'
import { DISARM_HOLD_MS } from '../useMotionGuard.js'
import { colors } from '../theme.js'

const SIZE = 42
const INNER = SIZE - 2 // innanför ramen

// Knappen för rörelsevakten, uppe till höger om ringen - spegelvänd mot
// klockknappen till vänster.
//
// - Av: ett tryck slår på vakten.
// - Nedräkning (3-2-1): ett tryck avbryter - man har bara ångrat sig.
// - Låst: ett tryck gör ingenting. Man måste hålla inne i tre sekunder, precis
//   som på larmskärmen. Annars kunde man lägga tillbaka telefonen när larmet
//   gick och sen bara trycka bort vakten.
function GuardButton({ guard }) {
  const fill = useRef(new Animated.Value(0)).current
  const animation = useRef(null)
  const locked = guard.phase === 'watching'

  function handlePress() {
    if (guard.phase === 'off') guard.arm()
    else if (guard.phase === 'arming') guard.disarm()
  }

  function startHold() {
    if (!locked) return
    animation.current = Animated.timing(fill, {
      toValue: 1,
      duration: DISARM_HOLD_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    })
    animation.current.start(({ finished }) => {
      if (!finished) return
      fill.setValue(0)
      guard.disarm()
    })
  }

  function stopHold() {
    animation.current?.stop()
    Animated.timing(fill, { toValue: 0, duration: 200, useNativeDriver: false }).start()
  }

  const fillHeight = fill.interpolate({ inputRange: [0, 1], outputRange: [0, INNER] })

  return (
    <View style={styles.corner}>
      <Pressable
        style={[styles.btn, guard.isOn && styles.on]}
        onPress={handlePress}
        onPressIn={startHold}
        onPressOut={stopHold}
        // Ett långt tryck ska inte räknas som ett vanligt tryck när man släpper -
        // då skulle vakten slås på igen direkt efter att den stängts av
        onLongPress={() => {}}
        delayLongPress={400}
        accessibilityLabel={locked ? 'Håll inne i tre sekunder för att stänga av vakten' : 'Lås mobilen på bordet'}
      >
        <LockIcon color={guard.isOn ? colors.accent : colors.muted} />

        {/* Mätaren: fylls underifrån med rött och klipper en vit kopia av låset */}
        <Animated.View pointerEvents="none" style={[styles.fill, { height: fillHeight }]}>
          <View style={styles.fillInner}>
            <LockIcon color="#fff" />
          </View>
        </Animated.View>
      </Pressable>

      {guard.phase === 'arming' && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{guard.armLeft}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  corner: { position: 'absolute', top: -4, right: -4 },
  btn: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  on: { borderColor: colors.accent },
  fill: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden', backgroundColor: colors.accent },
  fillInner: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: INNER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
})

export default GuardButton
