import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio'
import { createTask, uploadRecording } from '../api.js'
import { colors } from '../theme.js'

function NyttTjatScreen({ navigation }) {
  const [title, setTitle] = useState('')
  const [minutes, setMinutes] = useState(25)
  const [guard, setGuard] = useState(false)
  const [recording, setRecording] = useState(false)
  const [audioUri, setAudioUri] = useState(null)
  const [saving, setSaving] = useState(false)
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)

  async function toggleRecording() {
    if (recording) {
      await recorder.stop()
      setAudioUri(recorder.uri)
      setRecording(false)
      return
    }
    const { granted } = await requestRecordingPermissionsAsync()
    if (!granted) {
      Alert.alert('Ingen mikrofon', 'Nagster behöver mikrofonen för att kunna tjata med din röst.')
      return
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
    await recorder.prepareToRecordAsync()
    recorder.record()
    setRecording(true)
  }

  async function start() {
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      const task = await createTask({ title: title.trim(), durationSeconds: minutes * 60 })
      if (audioUri) await uploadRecording(task.id, audioUri)

      // Ljud spelas upp direkt från mobilen (audioUri) – servern har en kopia
      navigation.replace('Vakt', {
        taskId: task.id,
        title: task.title,
        seconds: minutes * 60,
        snoozeCount: 0,
        audioSource: audioUri,
        guard,
      })
    } catch (err) {
      Alert.alert('Hoppsan', err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.label}>1. Vad ska bli gjort?</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="t.ex. Plocka ur diskmaskinen"
        placeholderTextColor={colors.muted}
      />

      <Text style={styles.label}>2. Prata in ditt tjat</Text>
      <Pressable style={[styles.recordBtn, recording && styles.recordingBtn]} onPress={toggleRecording}>
        <Text style={styles.recordText}>
          {recording ? '⏹ Stoppa inspelningen' : audioUri ? '🎙️ Spela in igen' : '🎙️ Håll låten – spela in'}
        </Text>
      </Pressable>
      {audioUri && !recording && <Text style={styles.hint}>✓ Röst inspelad</Text>}

      <Text style={styles.label}>3. Hur lång tid får det ta?</Text>
      <View style={styles.stepper}>
        <Pressable style={styles.stepBtn} onPress={() => setMinutes((m) => Math.max(1, m - (m > 5 ? 5 : 1)))}>
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.minutes}>{minutes} min</Text>
        <Pressable style={styles.stepBtn} onPress={() => setMinutes((m) => m + (m >= 5 ? 5 : 1))}>
          <Text style={styles.stepText}>＋</Text>
        </Pressable>
      </View>

      <View style={styles.guardRow}>
        <Text style={styles.guardText}>🔒 Lås mobilen på bordet</Text>
        <Switch value={guard} onValueChange={setGuard} trackColor={{ true: colors.accent }} />
      </View>

      <Pressable style={[styles.startBtn, !title.trim() && { opacity: 0.4 }]} onPress={start}>
        <Text style={styles.startText}>{saving ? '…' : 'START'}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  label: { color: colors.muted, marginTop: 20, marginBottom: 8, fontSize: 13, textTransform: 'uppercase' },
  input: {
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: 12,
    padding: 14,
    fontSize: 17,
  },
  recordBtn: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.muted,
  },
  recordingBtn: { backgroundColor: colors.accent, borderColor: colors.accent },
  recordText: { color: colors.text, fontSize: 16 },
  hint: { color: colors.ok, marginTop: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  stepBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: colors.text, fontSize: 26 },
  minutes: { color: colors.text, fontSize: 30, fontWeight: '700', minWidth: 120, textAlign: 'center' },
  guardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
  },
  guardText: { color: colors.text, fontSize: 16 },
  startBtn: {
    marginTop: 'auto',
    backgroundColor: colors.accent,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  startText: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 2 },
})

export default NyttTjatScreen
