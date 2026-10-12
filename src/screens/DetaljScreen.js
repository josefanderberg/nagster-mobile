import { useRef, useState } from 'react'
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio'
import { deleteTask, updateTask } from '../store.js'
import { deleteLocalSound } from '../sounds.js'
import TimerRing from '../components/TimerRing.js'
import HoloText from '../components/HoloText.js'
import { turnDial } from '../dial.js'
import { isSecondsMode, ringUnits } from '../timerRing.js'
import { formatDuration } from '../time.js'
import { colors } from '../theme.js'

const PHOTO_LABELS = { snooze: 'Ertappad', done: 'Klarat', late: 'Till slut' }

// Detaljvyn för ett tjat: allt som är sparat om det, möjligheten att lyssna
// på inspelningen igen och att köra tjatet en gång till. Det pågående tjatet
// går varken att ändra, köra om eller ta bort - timern använder det.
function DetaljScreen({ route, navigation }) {
  const { task, isActive, canRerun } = route.params
  const player = useAudioPlayer(task.filePath)
  const status = useAudioPlayerStatus(player)
  const [seconds, setSeconds] = useState(task.durationSeconds)
  const [editingTime, setEditingTime] = useState(false)
  // Det senaste värdet, så att sparandet när fingret släpper inte missar sista steget
  const latestSeconds = useRef(seconds)

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

  function handlePointer(x, y, rect) {
    latestSeconds.current = turnDial(latestSeconds.current, x, y, rect)
    setSeconds(latestSeconds.current)
  }

  // Sparas när fingret släpper ringen, inte för varje steg
  function saveTime() {
    updateTask(task.id, { ...task, durationSeconds: latestSeconds.current }).catch((err) =>
      Alert.alert('Kunde inte spara tiden', err.message)
    )
  }

  // Timern bor på Hem, så tjatet startas därifrån
  function rerun() {
    navigation.popTo('Hem', { rerun: { id: task.id, seconds: latestSeconds.current } })
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
            .then(() => {
              deleteLocalSound(task.id) // den lokala notisljudskopian ska också bort
              navigation.goBack()
            })
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
        {/* Tryck på tiden för att ändra den med samma ring som på Hem */}
        <Pressable disabled={isActive} onPress={() => setEditingTime((shown) => !shown)}>
          <Row label="Tid" value={formatDuration(seconds)} editable={!isActive} />
        </Pressable>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Klarat</Text>
          {task.doneCount > 0 ? (
            <View style={styles.holo}>
              <HoloText text={`${task.doneCount} ggr`} seed={task.id} fontSize={15} />
            </View>
          ) : (
            <Text style={styles.rowValue}>0 ggr</Text>
          )}
        </View>
        <Row label="Snoozad" value={`${task.snoozeCount} ggr`} />
        {task.lateSeconds > 0 && <Row label="Försenad" value={formatDuration(task.lateSeconds)} late />}
        <Row label="Skapad" value={created} />
      </View>

      {editingTime && (
        <View style={styles.ring}>
          <TimerRing
            units={ringUnits(seconds)}
            label={formatDuration(seconds)}
            color={isSecondsMode(seconds) ? colors.seconds : colors.accent}
            mirrored={isSecondsMode(seconds)}
            onPointer={handlePointer}
            onRelease={saveTime}
          />
        </View>
      )}

      {canRerun && (
        <Pressable style={styles.rerunBtn} onPress={rerun}>
          <Text style={styles.rerunText}>Kör igen</Text>
        </Pressable>
      )}

      {/* Ringen tar plats - knapparna nedanför göms så länge den är framme */}
      {!editingTime &&
        (task.filePath ? (
          <Pressable style={styles.playBtn} onPress={togglePlay}>
            <Text style={styles.playText}>{status.playing ? 'Pausa' : 'Spela upp tjatet'}</Text>
          </Pressable>
        ) : (
          <Text style={styles.noAudio}>Inget inspelat tjat</Text>
        ))}

      {/* Ertappad-bilderna, nyast först */}
      {!editingTime && task.photos?.length > 0 && (
        <View style={styles.proof}>
          <Text style={styles.proofTitle}>
            Bevis <Text style={styles.proofLocal}>· bara i din telefon</Text>
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.proofRow}>
            {[...task.photos].reverse().map((photo) => (
              <View key={photo.name}>
                <Image source={{ uri: photo.uri }} style={styles.photo} />
                <Text style={[styles.photoLabel, photo.kind === 'snooze' && styles.photoCaught]}>
                  {PHOTO_LABELS[photo.kind] ?? 'Klarat'}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {!editingTime && !isActive && (
        <Pressable style={styles.deleteBtn} onPress={confirmDelete}>
          <Text style={styles.deleteText}>Ta bort tjatet</Text>
        </Pressable>
      )}
    </View>
  )
}

function Row({ label, value, editable = false, late = false }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, editable && styles.rowEditable, late && styles.rowLate]}>{value}</Text>
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
  rowEditable: { color: colors.accent },
  rowLate: { color: colors.accentDark },
  // Centrerad i raden - annars sträcks rutan ut och texten hamnar högt upp
  holo: { backgroundColor: colors.text, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, alignSelf: 'center', marginVertical: -4 },
  ring: { alignItems: 'center' },
  rerunBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  rerunText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  playBtn: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  playText: { color: colors.accent, fontWeight: '600', fontSize: 16 },
  noAudio: { color: colors.muted, textAlign: 'center' },
  deleteBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteText: { color: colors.accentDark, fontWeight: '600', fontSize: 16 },
  proof: { gap: 8 },
  proofTitle: { color: colors.muted, fontSize: 15 },
  proofLocal: { fontSize: 13 },
  proofRow: { gap: 10 },
  photo: { width: 88, height: 88, borderRadius: 12, backgroundColor: colors.border },
  photoLabel: { marginTop: 4, textAlign: 'center', fontSize: 12, fontWeight: '700', color: colors.ok },
  photoCaught: { color: colors.accentDark },
})

export default DetaljScreen
