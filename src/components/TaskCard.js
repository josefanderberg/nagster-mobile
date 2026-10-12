import { Pressable, StyleSheet, Text, View } from 'react-native'
import { formatDuration } from '../time.js'
import { FastForwardIcon } from './icons.js'
import { colors } from '../theme.js'

// onRun startar tjatet direkt från listan - eller i en inre ring om ett
// annat redan går. null när det inte går, t.ex. när två redan är igång.
// onPreview spelar upp tjatet när man håller inne på kortet.
function TaskCard({ task, isActive = false, onCancel, onRun = null, onPreview, onPress }) {
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
      style={[styles.card, isActive && styles.active]}
      onPress={onPress}
      onLongPress={onPreview}
      delayLongPress={350}
    >
      <View style={styles.top}>
        <Text style={[styles.title, isDone && styles.doneText]} numberOfLines={1}>
          {task.title}
        </Text>

        <View style={styles.right}>
          {isActive && (
            <Pressable style={styles.cancel} onPress={onCancel}>
              <Text style={styles.cancelText}>Avbryt</Text>
            </Pressable>
          )}
          {onRun && (
            <Pressable style={styles.run} onPress={onRun} hitSlop={8} accessibilityLabel="Kör tjatet igen">
              <FastForwardIcon color={colors.muted} />
            </Pressable>
          )}
          <View style={[styles.badge, isDone && styles.badgeDone]}>
            <Text style={[styles.badgeText, isDone && styles.badgeDoneText]}>
              {isDone ? 'Klart' : formatDuration(task.durationSeconds)}
            </Text>
          </View>
        </View>
      </View>

      {(task.doneCount > 0 || notes !== '') && (
        <View style={styles.bottom}>
          {task.doneCount > 0 && <Text style={styles.count}>Klarat {task.doneCount} ggr</Text>}
          {notes !== '' && (
            <Text style={[styles.snooze, isDone && styles.doneText]}>
              {notes.charAt(0).toUpperCase() + notes.slice(1)}
            </Text>
          )}
        </View>
      )}
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
  // Klara tjat tonas ner - men inte holo-räknaren, den ska lysa
  doneText: { opacity: 0.55 },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // Grå och diskret, som spola fram-knappen på en VHS
  run: {
    width: 30,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { color: colors.muted, fontSize: 13, fontWeight: '600' },
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
