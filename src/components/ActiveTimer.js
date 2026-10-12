import { useEffect, useMemo, useRef, useState } from 'react'
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native'
import { useKeepAwake } from 'expo-keep-awake'
import TimerRing from './TimerRing.js'
import HoloText from './HoloText.js'
import { ClockIcon, TimerIcon } from './icons.js'
import { localSoundUri } from '../sounds.js'
import { playNag } from '../nag.js'
import { isSecondsMode } from '../timerRing.js'
import { clockTime, formatCountdown } from '../time.js'
import { colors } from '../theme.js'

// Tjatet som är igång: ringen räknar ner och går inte att dra i.
// Ett varv är en minut, så sekundvisaren syns tydligt. När tiden är ute
// räknar ringen i stället uppåt i rött och tjatet stämplas som försenat.
function ActiveTimer({ task, endsAt, deadline, guard, onDone, onSnooze }) {
  useKeepAwake() // skärmen får inte somna - då slutar accelerometern mäta

  // Tiden kvar härleds ur en fast sluttid i stället för att räknas ner,
  // så att den stämmer även efter en stund i bakgrunden.
  const [now, setNow] = useState(() => Date.now())
  const [showClock, setShowClock] = useState(false)
  const stopNag = useRef(null)

  const secondsLeft = Math.max(0, Math.ceil((endsAt - now) / 1000))
  const expired = secondsLeft === 0
  // Förseningen räknas från första sluttiden - en snooze ger mer tid men
  // tar inte bort stämpeln
  const late = deadline !== null && now >= deadline
  const lateSeconds = Math.max(0, Math.floor((now - deadline) / 1000))

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

  // Kopian i Library/Sounds finns bara på iOS - annars spelas den sparade inspelningen
  const source = useMemo(
    () => localSoundUri(task.id) ?? task.filePath,
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
        {expired ? (
          <TimerRing
            units={lateSeconds}
            label={`+${formatCountdown(lateSeconds)}`}
            color={colors.accentDark}
            interactive={false}
          />
        ) : (
          <TimerRing
            units={secondsLeft}
            label={showClock ? clockTime(secondsLeft) : formatCountdown(secondsLeft)}
            color={colors.ok}
            mirrored={isSecondsMode(task.durationSeconds)}
            interactive={false}
          />
        )}

        {late && (
          <View pointerEvents="none" style={styles.stampWrap}>
            <View style={styles.stamp}>
              <Text style={styles.stampText}>FÖRSENAD</Text>
            </View>
          </View>
        )}

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

      {/* Belöningen mitt i tjatet: hur många gånger det redan är klarat */}
      {task.doneCount > 0 && (
        <View style={styles.holo}>
          <HoloText text={`Klarat ${task.doneCount} ggr`} seed={task.id} />
        </View>
      )}

      {/* Klart går alltid - även för sent. Snooza först när tiden är ute. */}
      <View style={styles.buttons}>
        <Pressable style={[styles.btn, styles.done]} onPress={handleDone}>
          <Text style={styles.btnText}>Klart</Text>
        </Pressable>
        {expired && (
          <Pressable style={[styles.btn, styles.snooze]} onPress={handleSnooze}>
            <Text style={styles.btnText}>Snooza</Text>
          </Pressable>
        )}
      </View>

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
  buttons: { flexDirection: 'row', gap: 12 },
  // Mörk etikett så att de ljusa holofärgerna lyser, som ett klistermärke
  holo: { backgroundColor: colors.text, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4 },
  btn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 28 },
  // Som en gummistämpel: snett, fet kant och lite genomskinlig bakgrund
  stampWrap: { position: 'absolute', top: 36, left: 0, right: 0, alignItems: 'center' },
  stamp: {
    borderWidth: 3,
    borderColor: colors.accentDark,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 2,
    backgroundColor: 'rgba(250, 247, 242, 0.9)',
    transform: [{ rotate: '-12deg' }],
  },
  stampText: { color: colors.accentDark, fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  done: { backgroundColor: colors.ok },
  snooze: { backgroundColor: colors.accent },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
})

export default ActiveTimer
