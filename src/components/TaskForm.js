import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import TimerRing from './TimerRing.js'
import Recorder from './Recorder.js'
import { useRecorder } from '../useRecorder.js'
import { isSecondsMode, ringUnits } from '../timerRing.js'
import { turnDial } from '../dial.js'
import { clockTime, formatDuration } from '../time.js'
import { colors } from '../theme.js'
import { ClockIcon, PencilIcon, TimerIcon } from './icons.js'
import GuardButton from './GuardButton.js'

const DEFAULT_SECONDS = 10
const BLINK_MS = 600

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
  const ready = canStart && !saving

  // Starta blinkar grönt så fort det finns något att starta
  const blink = useRef(new Animated.Value(1)).current
  useEffect(() => {
    if (!ready) {
      blink.setValue(1)
      return
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.45, duration: BLINK_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: BLINK_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [ready, blink])

  function handlePointer(x, y, rect) {
    setSeconds(turnDial(seconds, x, y, rect))
  }

  async function handleStart() {
    if (!canStart || saving) return

    Keyboard.dismiss()
    setSaving(true)
    try {
      // Pågår en inspelning stoppas den här, så att tjatet kommer med
      const audio = await recorder.stop()
      // Tom titel går bra - då gör Hem en titel av det som sades in
      await onAdd(title.trim(), seconds, audio)
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

      <Pressable onPress={handleStart} disabled={!canStart || saving}>
        <Animated.View style={[styles.startBtn, canStart ? styles.ready : styles.disabled, { opacity: blink }]}>
          <Text style={[styles.startText, !canStart && styles.disabledText]}>{saving ? 'Startar …' : 'Starta'}</Text>
        </Animated.View>
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
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  ready: { backgroundColor: colors.ok },
  disabled: { backgroundColor: colors.border },
  disabledText: { color: colors.muted },
  startText: { color: '#fff', fontWeight: '600', fontSize: 16 },
})

export default TaskForm
