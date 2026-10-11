import { useEffect, useMemo, useRef, useState } from 'react'
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native'
import { useKeepAwake } from 'expo-keep-awake'
import TimerRing from './TimerRing.js'
import { ClockIcon, TimerIcon } from './icons.js'
import { fileUrl } from '../api.js'
import { localSoundUri } from '../sounds.js'
import { playNag } from '../nag.js'
import { isSecondsMode } from '../timerRing.js'
import { clockTime, formatCountdown } from '../time.js'
import { colors } from '../theme.js'

// Tjatet som är igång: ringen räknar ner och går inte att dra i.
// Ett varv är en minut, så sekundvisaren syns tydligt.
function ActiveTimer({ task, endsAt, guard, onDone, onSnooze }) {
  useKeepAwake() // skärmen får inte somna - då slutar accelerometern mäta

  // Tiden kvar härleds ur en fast sluttid i stället för att räknas ner,
  // så att den stämmer även efter en stund i bakgrunden.
  const [now, setNow] = useState(() => Date.now())
  const [showClock, setShowClock] = useState(false)
  const stopNag = useRef(null)

  const secondsLeft = Math.max(0, Math.ceil((endsAt - now) / 1000))
  const expired = secondsLeft === 0

  useEffect(() => {
    const tick = () => setNow(Date.now())
    const interval = setInterval(tick, 250)
    // Tillbaka från bakgrunden: synka direkt i stället för att vänta på ticket
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick()
    })
    return () => {
      clearInterval(interval)
      subscription.remove()
    }
  }, [])

  // Den lokala kopian funkar utan server - annars strömmas filen från API:et
  const source = useMemo(
    () => localSoundUri(task.id) ?? (task.filePath ? fileUrl(task.filePath) : null),
    [task.id, task.filePath]
  )

  // När tiden går ut börjar rösten tjata
  useEffect(() => {
    if (!expired || !source) return
    let cancelled = false

    playNag(source, task.snoozeCount).then((stop) => {
      if (cancelled) stop()
      else stopNag.current = stop
    })

    return () => {
      cancelled = true
      stopNag.current?.()
    }
  }, [expired, source, task.snoozeCount])

  // Själva snooze-tiden räknas ut i HemScreen, som också bokar om notisen
  function handleSnooze() {
    stopNag.current?.()
    onSnooze()
  }

  function handleDone() {
    stopNag.current?.()
    onDone()
  }

  const arming = guard.phase === 'arming'
  const status = arming ? `Lägg mobilen på bordet … ${guard.armLeft}` : task.title

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
        <Text style={[styles.title, arming && styles.guardText]} numberOfLines={1}>
          {status}
        </Text>
      </View>

      <Pressable
        style={[styles.btn, expired ? styles.snooze : styles.done]}
        onPress={expired ? handleSnooze : handleDone}
      >
        <Text style={styles.btnText}>{expired ? 'Snooza' : 'Klart'}</Text>
      </Pressable>

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
  guardText: { color: colors.accent, fontWeight: '600' },
  btn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 28 },
  done: { backgroundColor: colors.ok },
  snooze: { backgroundColor: colors.accent },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
})

export default ActiveTimer
