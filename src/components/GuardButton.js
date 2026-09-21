import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LockIcon } from './icons.js'
import { colors } from '../theme.js'

// Knappen för rörelsevakten, uppe till höger om ringen – spegelvänd mot
// klockknappen till vänster. Siffran är nedräkningen innan vakten låser.
function GuardButton({ guard }) {
  return (
    <Pressable
      style={[styles.btn, guard.isOn && styles.on]}
      onPress={guard.isOn ? guard.disarm : guard.arm}
      accessibilityLabel={guard.isOn ? 'Stäng av vakten' : 'Lås mobilen på bordet'}
    >
      <LockIcon color={guard.isOn ? colors.accent : colors.muted} />

      {guard.phase === 'arming' && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{guard.armLeft}</Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    top: -4,
    right: -4,
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
