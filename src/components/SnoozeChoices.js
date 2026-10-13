import { Pressable, StyleSheet, Text, View } from 'react-native'
import { snoozeChoices } from '../snooze.js'
import { colors } from '../theme.js'

// Valen 1, 5 och 10 på en rad, i stället för knapparna som öppnade dem och
// lika hög som de - ledtråden under ligger utanför, så att inget hoppar.
// Med color blir knapparna konturer i den färgen - som i vaktens larm.
function SnoozeChoices({ durationSeconds, onPick, color = null }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {snoozeChoices(durationSeconds).map((choice) => (
          <Pressable
            key={choice.seconds}
            style={[styles.btn, color ? { borderColor: color, borderWidth: 2 } : styles.filled]}
            onPress={() => onPick?.(choice.seconds)}
          >
            <Text style={[styles.text, color && { color }]}>+{choice.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.hint, color && { color }]}>Väljer du inget blir det 2 min</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  row: { flexDirection: 'row', gap: 10 },
  btn: { borderRadius: 10, paddingVertical: 8, minWidth: 72, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  filled: { backgroundColor: colors.accent },
  text: { color: '#fff', fontWeight: '700', fontSize: 16 },
  hint: { position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, textAlign: 'center', color: '#fff', fontSize: 12, opacity: 0.8 },
})

export default SnoozeChoices
