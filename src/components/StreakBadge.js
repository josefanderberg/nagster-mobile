import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { holoVariant } from './HoloText.js'
import { StarIcon } from './icons.js'
import { colors } from '../theme.js'

const BLINK_MS = 400

// Streaken uppe till vänster: hur många tjat i rad som klarats i tid, med en
// stjärna till höger som blinkar i holofärger så länge streaken lever.
// Ingen ram runt - det är ingen knapp. color är siffrornas färg, ljus när
// rubrikraden är mörk.
function StreakBadge({ count, color = colors.text }) {
  const alive = count > 0
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!alive) return
    const interval = setInterval(() => setStep((current) => current + 1), BLINK_MS)
    return () => clearInterval(interval)
  }, [alive])

  // Varianten byts när streaken växer, så att stjärnan får nya färger
  const holo = holoVariant(count).colors
  const starColor = alive ? holo[step % (holo.length - 1)] : colors.muted

  return (
    <View style={styles.badge} accessibilityLabel={`${count} tjat i rad klarade i tid`}>
      <Text style={[styles.count, { color: alive ? color : colors.muted }]}>{count}</Text>
      <StarIcon color={starColor} />
    </View>
  )
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  count: { fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
})

export default StreakBadge
