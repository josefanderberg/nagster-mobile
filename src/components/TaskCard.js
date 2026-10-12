import { Pressable, StyleSheet, Text, View } from 'react-native'
import { formatDuration } from '../time.js'
import { colors } from '../theme.js'

function TaskCard({ task, isActive = false, onCancel, onPress }) {
  const isDone = task.status === 'done'
  // T.ex. "Försenad 4m · snoozad 2 ggr" - äldre tjat saknar lateSeconds
  const notes = [
    task.lateSeconds > 0 && `försenad ${formatDuration(task.lateSeconds)}`,
    task.snoozeCount > 0 && `snoozad ${task.snoozeCount} ggr`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Pressable
      style={[styles.card, isDone && styles.done, isActive && styles.active]}
      onPress={onPress}
    >
      <View style={styles.top}>
        <Text style={styles.title} numberOfLines={1}>
          {task.title}
        </Text>

        <View style={styles.right}>
          {isActive && (
            <Pressable style={styles.cancel} onPress={onCancel}>
              <Text style={styles.cancelText}>Avbryt</Text>
            </Pressable>
          )}
          <View style={[styles.badge, isDone && styles.badgeDone]}>
            <Text style={[styles.badgeText, isDone && styles.badgeDoneText]}>
              {isDone ? 'Klart' : formatDuration(task.durationSeconds)}
            </Text>
          </View>
        </View>
      </View>

      {notes !== '' && <Text style={styles.snooze}>{notes.charAt(0).toUpperCase() + notes.slice(1)}</Text>}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  done: { opacity: 0.55 },
  active: { borderColor: colors.ok },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '600' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cancel: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: { color: colors.muted, fontSize: 12 },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  badgeDone: { borderColor: colors.ok, backgroundColor: '#e8f6ee' },
  badgeText: { color: colors.muted, fontSize: 12 },
  badgeDoneText: { color: colors.ok },
  snooze: { color: colors.accentDark, fontSize: 13 },
})

export default TaskCard
