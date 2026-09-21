import { Pressable, StyleSheet, Text, View } from 'react-native'
import { formatDuration } from '../time.js'
import { colors } from '../theme.js'

function TaskCard({ task, isActive = false, onCancel }) {
  const isDone = task.status === 'done'

  return (
    <View style={[styles.card, isDone && styles.done, isActive && styles.active]}>
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

      {task.snoozeCount > 0 && (
        <Text style={styles.snooze}>Snoozad {task.snoozeCount} ggr</Text>
      )}
    </View>
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
