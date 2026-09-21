import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LockIcon } from './icons.js'
import { colors } from '../theme.js'

// Knappen för rörelsevakten, uppe till höger om ringen - spegelvänd mot
// klockknappen till vänster.
//
// - Av: ett tryck slår på vakten.
// - Nedräkning (3-2-1): ett tryck avbryter - man har bara ångrat sig.
// - Låst: knappen syns inte, skärmen är svart. Vakten stängs bara av genom att
//   hålla inne i tre sekunder där (se GuardScreen).
function GuardButton({ guard }) {
  return (
    <View style={styles.corner}>
      <Pressable
        style={[styles.btn, guard.isOn && styles.on]}
        onPress={guard.isOn ? guard.disarm : guard.arm}
        accessibilityLabel={guard.isOn ? 'Avbryt vakten' : 'Lås mobilen på bordet'}
      >
        <LockIcon color={guard.isOn ? colors.accent : colors.muted} />
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
