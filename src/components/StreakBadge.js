import { StyleSheet, Text, View } from 'react-native'
import HoloText from './HoloText.js'
import { FlameIcon } from './icons.js'
import { colors } from '../theme.js'

// Streaken uppe till vänster: en låga och hur många tjat i rad som klarats i
// tid. Siffran glimmar i holo, och varianten byts när streaken växer.
function StreakBadge({ count }) {
  const alive = count > 0
  return (
    <View style={styles.badge} accessibilityLabel={`${count} tjat i rad klarade i tid`}>
      <FlameIcon color={alive ? colors.accent : colors.muted} />
      {alive ? (
        <HoloText text={String(count)} seed={count} fontSize={17} outline />
      ) : (
        <Text style={styles.zero}>0</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  zero: { color: colors.muted, fontSize: 17, fontWeight: '800' },
})

export default StreakBadge
