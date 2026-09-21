import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useKeepAwake } from 'expo-keep-awake'
import TimerRing from './TimerRing.js'
import GuardAlarm from './GuardAlarm.js'
import { ClockIcon, TimerIcon } from './icons.js'
import { fileUrl } from '../api.js'
import { playNag } from '../nag.js'
import { useMotionGuard } from '../useMotionGuard.js'
import { isSecondsMode } from '../timerRing.js'
import { clockTime, formatCountdown } from '../time.js'
import { colors } from '../theme.js'

const SNOOZE_MINUTES = 10

// Tjatet som är igång: ringen räknar ner och går inte att dra i.
// Ett varv är en minut, så sekundvisaren syns tydligt.
function ActiveTimer({ task, guard, onDone, onSnooze }) {
  useKeepAwake() // skärmen får inte somna – då slutar accelerometern mäta

  const [secondsLeft, setSecondsLeft] = useState(task.durationSeconds)
  const [showClock, setShowClock] = useState(false)
  const stopNag = useRef(null)
  const motion = useMotionGuard(guard)

  const expired = secondsLeft === 0

  useEffect(() => {
    if (expired) return
    const interval = setInterval(() => setSecondsLeft((left) => Math.max(0, left - 1)), 1000)
    return () => clearInterval(interval)
  }, [expired])

  // När tiden går ut börjar rösten tjata
  useEffect(() => {
    if (!expired || !task.filePath) return
    let cancelled = false

    playNag(fileUrl(task.filePath), task.snoozeCount).then((stop) => {
      if (cancelled) stop()
      else stopNag.current = stop
    })

    return () => {
      cancelled = true
      stopNag.current?.()
    }
  }, [expired, task.filePath, task.snoozeCount])

  // Snooze ger tio minuter till – eller samma antal sekunder igen om tjatet
  // sattes i sekunder, så att man kan visa upp det snabbt.
  function handleSnooze() {
    stopNag.current?.()
    const extra = isSecondsMode(task.durationSeconds) ? task.durationSeconds : SNOOZE_MINUTES * 60
    setSecondsLeft(extra)
    onSnooze()
  }

  function handleDone() {
    stopNag.current?.()
    onDone()
  }

  const status =
    motion.phase === 'arming'
      ? `Lägg mobilen på bordet … ${motion.armLeft}`
      : motion.phase === 'watching'
        ? 'Vakten är på – rör inte mobilen'
        : task.title

  return (
    <View style={styles.wrapper}>
      <View>
        <TimerRing
          units={secondsLeft}
          label={showClock ? clockTime(secondsLeft) : formatCountdown(secondsLeft)}
          color={expired ? colors.accentDark : colors.ok}
          mirrored={isSecondsMode(task.durationSeconds)}
          interactive={false}
        />

        <Pressable style={styles.cornerBtn} onPress={() => setShowClock((shown) => !shown)}>
          {showClock ? <TimerIcon color={colors.muted} /> : <ClockIcon color={colors.muted} />}
        </Pressable>
      </View>

      {/* Samma höjd som formulärets knapprad, annars hoppar ringen */}
      <View style={styles.titleRow}>
        <Text style={[styles.title, motion.phase !== 'off' && styles.guardText]} numberOfLines={1}>
          {status}
        </Text>
      </View>

      <Pressable
        style={[styles.btn, expired ? styles.snooze : styles.done]}
        onPress={expired ? handleSnooze : handleDone}
      >
        <Text style={styles.btnText}>{expired ? 'Snooza' : 'Klart'}</Text>
      </Pressable>

      <GuardAlarm visible={motion.phase === 'alarm'} title={task.title} onDisarm={motion.disarm} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: 16 },
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
  titleRow: { height: 46, justifyContent: 'center' },
  title: { color: colors.muted, fontSize: 15 },
  guardText: { color: colors.ok, fontWeight: '600' },
  btn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 28 },
  done: { backgroundColor: colors.ok },
  snooze: { backgroundColor: colors.accent },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
})

export default ActiveTimer
