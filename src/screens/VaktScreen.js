import { useEffect, useRef, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, Vibration, View } from 'react-native'
import { Accelerometer } from 'expo-sensors'
import * as Haptics from 'expo-haptics'
import { useKeepAwake } from 'expo-keep-awake'
import { updateTask, getTasks } from '../api.js'
import { playNag } from '../nag.js'
import { colors } from '../theme.js'

const SNOOZE_MINUTES = 5
const ARM_SECONDS = 5 // nedräkning innan vakten låser
const MOVE_THRESHOLD = 0.18 // hur stor rörelse (i g) som utlöser larmet
const DISARM_HOLD_MS = 3000 // så länge måste knappen hållas inne

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

function VaktScreen({ navigation, route }) {
  const { taskId, title, seconds, audioSource, guard } = route.params
  useKeepAwake() // skärmen får inte somna medan vakten jobbar

  const [secondsLeft, setSecondsLeft] = useState(seconds)
  const [snoozeCount, setSnoozeCount] = useState(route.params.snoozeCount)
  const [phase, setPhase] = useState(guard ? 'arming' : 'stealth') // arming | stealth | alarm | expired
  const [armCountdown, setArmCountdown] = useState(ARM_SECONDS)
  const [holdProgress, setHoldProgress] = useState(false)
  const [guardActive, setGuardActive] = useState(guard)

  const baseline = useRef(null)
  const nagRef = useRef(null)
  const vibrationRef = useRef(null)
  const holdTimer = useRef(null)

  const expired = secondsLeft === 0

  // ---- Nedräkning tills det är dags ----
  useEffect(() => {
    if (expired) return
    const interval = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(interval)
  }, [expired])

  // ---- Rörelsevakten: nedräkning → spara nollposition ----
  useEffect(() => {
    if (phase !== 'arming') return
    if (armCountdown === 0) {
      setPhase('stealth')
      return
    }
    const timeout = setTimeout(() => setArmCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timeout)
  }, [phase, armCountdown])

  // ---- Rörelsevakten: lyssna på accelerometern ----
  useEffect(() => {
    if (!guardActive || phase === 'arming' || expired) return
    Accelerometer.setUpdateInterval(150)
    const subscription = Accelerometer.addListener((reading) => {
      if (!baseline.current) {
        baseline.current = reading // första mätningen = mobilens läge på bordet
        return
      }
      const delta = Math.sqrt(
        (reading.x - baseline.current.x) ** 2 +
          (reading.y - baseline.current.y) ** 2 +
          (reading.z - baseline.current.z) ** 2
      )
      if (delta > MOVE_THRESHOLD) setPhase('alarm')
    })
    return () => subscription.remove()
  }, [guardActive, phase, expired])

  // ---- Haptisk bestraffning vid larm ----
  useEffect(() => {
    if (phase !== 'alarm') return
    vibrationRef.current = setInterval(() => {
      Vibration.vibrate(400)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    }, 500)
    return () => {
      clearInterval(vibrationRef.current)
      Vibration.cancel()
    }
  }, [phase])

  // ---- Tiden är ute: börja tjata ----
  useEffect(() => {
    if (!expired) return
    setPhase('expired')
    if (audioSource) nagRef.current = playNag(audioSource, snoozeCount)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    return () => nagRef.current?.stop()
  }, [expired]) // eslint-disable-line react-hooks/exhaustive-deps

  function stopNag() {
    nagRef.current?.stop()
    nagRef.current = null
  }

  // Larmet stängs bara av genom att hålla knappen intryckt i 3 sekunder –
  // det hindrar dig från att avfärda det på ren autopilot.
  function holdStart() {
    setHoldProgress(true)
    holdTimer.current = setTimeout(() => {
      baseline.current = null
      setGuardActive(false)
      setPhase('stealth')
      setHoldProgress(false)
    }, DISARM_HOLD_MS)
  }

  function holdEnd() {
    clearTimeout(holdTimer.current)
    setHoldProgress(false)
  }

  async function saveTask(changes) {
    try {
      const tasks = await getTasks()
      const current = tasks.find((t) => t.id === taskId)
      if (current) await updateTask(taskId, { ...current, ...changes })
    } catch (err) {
      Alert.alert('Kunde inte spara', err.message)
    }
  }

  async function markDone() {
    stopNag()
    await saveTask({ status: 'done' })
    navigation.popToTop()
  }

  async function snooze() {
    stopNag()
    const next = snoozeCount + 1
    setSnoozeCount(next)
    setSecondsLeft(SNOOZE_MINUTES * 60)
    setPhase('stealth')
    await saveTask({ snoozeCount: next })
  }

  // ---------- LARM: du rörde mobilen ----------
  if (phase === 'alarm') {
    return (
      <View style={[styles.screen, styles.alarmScreen]}>
        <Text style={styles.alarmEmoji}>🚨</Text>
        <Text style={styles.alarmTitle}>LÄGG NED{'\n'}MOBILEN</Text>
        <Text style={styles.alarmSub}>”{title}” är inte klart än.</Text>
        <Pressable style={styles.holdBtn} onPressIn={holdStart} onPressOut={holdEnd}>
          <Text style={styles.holdText}>
            {holdProgress ? 'Håll kvar…' : 'Håll inne 3 sek för att stänga av vakten'}
          </Text>
        </Pressable>
      </View>
    )
  }

  // ---------- DAGS: tiden är ute ----------
  if (phase === 'expired') {
    return (
      <View style={[styles.screen, styles.expiredScreen]}>
        <Text style={styles.alarmEmoji}>⏰</Text>
        <Text style={styles.expiredTitle}>DAGS NU!</Text>
        <Text style={styles.expiredTask}>{title}</Text>
        {snoozeCount > 0 && <Text style={styles.snoozeMeta}>😤 Snoozad {snoozeCount} ggr</Text>}
        <Pressable style={styles.doneBtn} onPress={markDone}>
          <Text style={styles.doneText}>Klart ✓</Text>
        </Pressable>
        <Pressable style={styles.snoozeBtn} onPress={snooze}>
          <Text style={styles.snoozeText}>Snooza {SNOOZE_MINUTES} min (rösten blir värre…)</Text>
        </Pressable>
      </View>
    )
  }

  // ---------- STEALTH: dimmad väntskärm ----------
  return (
    <View style={styles.screen}>
      {phase === 'arming' ? (
        <>
          <Text style={styles.armText}>Lägg mobilen på bordet</Text>
          <Text style={styles.armCountdown}>{armCountdown}</Text>
          <Text style={styles.armHint}>vakten låser strax…</Text>
        </>
      ) : (
        <>
          <Text style={styles.stealthTask}>{title}</Text>
          <Text style={styles.stealthTimer}>{formatTime(secondsLeft)}</Text>
          <Text style={styles.stealthHint}>
            {guardActive ? '🔒 Vakten är på – rör inte mobilen' : 'Jobba nu. Nagster väntar.'}
          </Text>
          <Pressable style={styles.earlyDone} onPress={markDone}>
            <Text style={styles.earlyDoneText}>Klart redan ✓</Text>
          </Pressable>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  // stealth
  stealthTask: { color: '#3a3d45', fontSize: 18 },
  stealthTimer: { color: '#565b66', fontSize: 72, fontVariant: ['tabular-nums'], marginVertical: 8 },
  stealthHint: { color: '#3a3d45', fontSize: 14 },
  earlyDone: { marginTop: 48, padding: 12 },
  earlyDoneText: { color: '#3a3d45', fontSize: 15 },
  // arming
  armText: { color: colors.text, fontSize: 22 },
  armCountdown: { color: colors.accent, fontSize: 96, fontWeight: '800', marginVertical: 12 },
  armHint: { color: colors.muted },
  // alarm
  alarmScreen: { backgroundColor: '#c1121f' },
  alarmEmoji: { fontSize: 64 },
  alarmTitle: { color: '#fff', fontSize: 48, fontWeight: '900', textAlign: 'center', lineHeight: 54 },
  alarmSub: { color: '#ffd7d9', fontSize: 16, marginTop: 12 },
  holdBtn: {
    marginTop: 48,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  holdText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  // expired
  expiredScreen: { backgroundColor: colors.bg },
  expiredTitle: { color: colors.accent, fontSize: 42, fontWeight: '900' },
  expiredTask: { color: colors.text, fontSize: 20, marginTop: 8 },
  snoozeMeta: { color: colors.muted, marginTop: 8 },
  doneBtn: {
    marginTop: 40,
    backgroundColor: colors.ok,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 48,
  },
  doneText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  snoozeBtn: { marginTop: 16, padding: 12 },
  snoozeText: { color: colors.muted, fontSize: 15 },
})

export default VaktScreen
