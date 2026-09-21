import { useState } from 'react'
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import TimerRing from './TimerRing.js'
import Recorder from './Recorder.js'
import { useRecorder } from '../useRecorder.js'
import { isSecondsMode, MIN_SECONDS, ringUnits, secondsFromPointer } from '../timerRing.js'
import { clockTime, formatDuration } from '../time.js'
import { colors } from '../theme.js'
import { ClockIcon, PencilIcon, TimerIcon } from './icons.js'
import GuardButton from './GuardButton.js'

const DEFAULT_SECONDS = 25 * 60
const DEFAULT_TITLE = 'Inspelat tjat'

function TaskForm({ onAdd, onError, guard }) {
  const [title, setTitle] = useState('')
  const [seconds, setSeconds] = useState(DEFAULT_SECONDS)
  const [showClock, setShowClock] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const recorder = useRecorder(onError)

  const secondsMode = isSecondsMode(seconds)

  // Ett tjat kräver en titel eller en inspelning - båda behövs inte.
  // Rörelsevakten räknas inte: den är en egen funktion som inte sparar något.
  const canStart = Boolean(title.trim()) || recorder.isRecording || recorder.audio !== null

  // Ett klick för varje steg man snurrar, som på en riktig ratt. Telefonen
  // rapporterar fingret ungefär 60 gånger i sekunden, så snurrar man snabbt
  // hinner ringen flytta flera steg mellan varje rapport - då blir klicket
  // kraftigare i stället, så att fart känns som mer vibration och inte mindre.
  function handlePointer(x, y, rect) {
    const next = Math.max(MIN_SECONDS, secondsFromPointer(seconds, x, y, rect))
    if (next === seconds) return

    const stepSize = secondsMode ? 1 : 60
    const steps = Math.abs(next - seconds) / stepSize

    if (isSecondsMode(next) !== secondsMode) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy) // bytet vid toppen
    } else if (steps >= 4) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    } else if (steps >= 2) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } else {
      Haptics.selectionAsync()
    }
    setSeconds(next)
  }

  async function handleStart() {
    if (!canStart || saving) return

    Keyboard.dismiss()
    setSaving(true)
    try {
      // Pågår en inspelning stoppas den här, så att tjatet kommer med
      const audio = await recorder.stop()
      await onAdd(title.trim() || DEFAULT_TITLE, seconds, audio)
      setTitle('')
      setEditing(false)
      recorder.reset()
    } catch (err) {
      onError(err.message)
    } finally {
      // Släpp alltid spärren, annars fastnar knappen på "Startar …" om något går fel
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <View>
        <TimerRing
          units={ringUnits(seconds)}
          label={showClock ? clockTime(seconds) : formatDuration(seconds)}
          color={secondsMode ? colors.seconds : colors.accent}
          mirrored={secondsMode}
          onPointer={handlePointer}
        />

        {/* Växlar mellan hur lång tid det är och vad klockan är när tiden gått ut */}
        <Pressable style={styles.cornerBtn} onPress={() => setShowClock((shown) => !shown)}>
          {showClock ? <TimerIcon color={colors.muted} /> : <ClockIcon color={colors.muted} />}
        </Pressable>

        <GuardButton guard={guard} />
      </View>

      <View style={styles.actions}>
        {editing ? (
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Vad ska bli gjort?"
            placeholderTextColor={colors.muted}
            autoFocus
            returnKeyType="go"
            onSubmitEditing={handleStart}
            onBlur={() => !title.trim() && setEditing(false)}
          />
        ) : (
          <Pressable style={styles.iconBtn} onPress={() => setEditing(true)}>
            <PencilIcon color={colors.muted} />
          </Pressable>
        )}

        <Recorder
          isRecording={recorder.isRecording}
          hasRecording={recorder.audio !== null}
          onStart={recorder.start}
          onStop={recorder.stop}
        />

      </View>

      <Pressable
        style={[styles.startBtn, !canStart && styles.disabled]}
        onPress={handleStart}
        disabled={!canStart || saving}
      >
        <Text style={styles.startText}>{saving ? 'Startar …' : 'Starta'}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  form: { alignItems: 'center', gap: 16 },
  cornerBtn: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Fast höjd, annars hoppar ringen när textrutan fälls ut
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 46 },
  iconBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    width: 240,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    textAlign: 'center',
    color: colors.text,
  },
  startBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  disabled: { opacity: 0.45 },
  startText: { color: '#fff', fontWeight: '600', fontSize: 16 },
})

export default TaskForm
