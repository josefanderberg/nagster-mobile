import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio'
import { deleteTask, fileUrl } from '../api.js'
import { formatDuration } from '../time.js'
import { colors } from '../theme.js'

// Detaljvyn för ett tjat: allt som är sparat om det, plus möjligheten att
// lyssna på inspelningen igen.
function DetaljScreen({ route, navigation }) {
  const { task, canDelete } = route.params
  const player = useAudioPlayer(task.filePath ? fileUrl(task.filePath) : null)
  const status = useAudioPlayerStatus(player)

  const isDone = task.status === 'done'
  const created = new Date(task.createdAt).toLocaleString('sv-SE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  function togglePlay() {
    if (status.playing) {
      player.pause()
    } else {
      player.seekTo(0)
      player.play()
    }
  }

  // På mobilen bekräftas borttagning med en systemdialog - det går inte att ångra.
  // Hem hämtar listan på nytt när den visas, så det räcker att gå tillbaka.
  function confirmDelete() {
    Alert.alert('Ta bort tjatet?', 'Inspelningen raderas också.', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Ta bort',
        style: 'destructive',
        onPress: () =>
          deleteTask(task.id)
            .then(() => navigation.goBack())
            .catch((err) => Alert.alert('Kunde inte ta bort', err.message)),
      },
    ])
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{task.title}</Text>

      <View style={[styles.badge, isDone && styles.badgeDone]}>
        <Text style={[styles.badgeText, isDone && styles.badgeDoneText]}>
          {isDone ? 'Klart' : 'Pågår'}
        </Text>
      </View>

      <View style={styles.facts}>
        <Row label="Tid" value={formatDuration(task.durationSeconds)} />
        <Row label="Snoozad" value={`${task.snoozeCount} ggr`} />
        <Row label="Skapad" value={created} />
      </View>

      {task.filePath ? (
        <Pressable style={styles.playBtn} onPress={togglePlay}>
          <Text style={styles.playText}>{status.playing ? 'Pausa' : 'Spela upp tjatet'}</Text>
        </Pressable>
      ) : (
        <Text style={styles.noAudio}>Inget inspelat tjat</Text>
      )}

      {canDelete && (
        <Pressable style={styles.deleteBtn} onPress={confirmDelete}>
          <Text style={styles.deleteText}>Ta bort tjatet</Text>
        </Pressable>
      )}
    </View>
  )
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 24, gap: 16 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 12,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  badgeDone: { borderColor: colors.ok, backgroundColor: '#e8f6ee' },
  badgeText: { color: colors.muted, fontSize: 13 },
  badgeDoneText: { color: colors.ok },
  facts: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: { color: colors.muted, fontSize: 15 },
  rowValue: { color: colors.text, fontSize: 15, fontWeight: '600' },
  playBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  playText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  noAudio: { color: colors.muted, textAlign: 'center' },
  deleteBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteText: { color: colors.accentDark, fontWeight: '600', fontSize: 16 },
})

export default DetaljScreen
