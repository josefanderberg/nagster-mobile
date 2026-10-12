import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LockIcon } from './icons.js'
import { holoVariant } from './HoloText.js'
import { colors } from '../theme.js'

// Knappen för rörelsevakten, uppe till höger om ringen - spegelvänd mot
// klockknappen till vänster.
//
// - Av: ett tryck slår på vakten.
// - Nedräkning (3-2-1): ett tryck avbryter - man har bara ångrat sig.
// - Låst: knappen syns inte, skärmen är svart. Vakten stängs bara av genom att
//   hålla inne i tre sekunder där (se GuardScreen).
//
// Med blinkSeed (tjatets id) blinkar den avstängda knappen i tjatets
// holofärger - en påminnelse om att lägga ner mobilen medan tiden går.
const BLINK_MS = 350

function GuardButton({ guard, blinkSeed = null }) {
  const blinking = blinkSeed !== null && !guard.isOn
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!blinking) return
    const interval = setInterval(() => setStep((current) => current + 1), BLINK_MS)
    return () => clearInterval(interval)
  }, [blinking])

  // Varannan gång en holofärg, varannan släckt - då ser det ut att blinka
  const holoColors = blinking ? holoVariant(blinkSeed).colors : null
  const blinkColor = blinking && step % 2 === 0 ? holoColors[(step / 2) % (holoColors.length - 1)] : null
  const iconColor = guard.isOn ? colors.accent : (blinkColor ?? colors.muted)

  return (
    <View style={styles.corner}>
      <Pressable
        style={[styles.btn, guard.isOn && styles.on, blinkColor && { borderColor: blinkColor, borderWidth: 2 }]}
        onPress={guard.isOn ? guard.disarm : guard.arm}
        accessibilityLabel={guard.isOn ? 'Avbryt vakten' : 'Lås mobilen på bordet'}
      >
        <LockIcon color={iconColor} />
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  on: { borderColor: colors.accent },
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
