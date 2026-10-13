import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, AppState, Pressable, StyleSheet, Text, View } from 'react-native'
import { useKeepAwake } from 'expo-keep-awake'
import TimerRing from './TimerRing.js'
import HoloText from './HoloText.js'
import GuardButton from './GuardButton.js'
import { ClockIcon, TimerIcon } from './icons.js'
import { localSoundUri } from '../sounds.js'
import { playNag, speakNag } from '../nag.js'
import { isSecondsMode, SIZE } from '../timerRing.js'
import { clockTime, timerLabel, timerState } from '../time.js'
import { colors, SHADE } from '../theme.js'

const INNER_SCALE = 0.64 // den inre ringen får plats innanför den yttre
const INNER_GREEN = '#3fb6a8' // lite blågrönare, så att ringarna går att skilja åt

// En ring per tjat: grön nedräkning, eller röd uppräkning när tiden är ute
function Ring({ timer, state, label, green }) {
  return state.expired ? (
    <TimerRing units={state.lateSeconds} label={label} color={colors.accentDark} interactive={false} />
  ) : (
    <TimerRing
      units={state.secondsLeft}
      label={label}
      color={green}
      mirrored={isSecondsMode(timer.task.durationSeconds)}
      interactive={false}
    />
  )
}

// Tjaten som är igång: ringarna räknar ner och går inte att dra i. Ett varv
// är en minut, så sekundvisaren syns tydligt. Ett andra tjat syns som en
// inre ring. Klart och Snooza gäller det som tar slut först (current).
// När tiden är ute mörknar allt utom knapparna - då är det bara de som
// gäller. onFocusChange berättar det för skärmen, som mörkar resten.
function ActiveTimer({ timers, current, guard, onDone, onSnooze, onFocusChange }) {
  useKeepAwake() // skärmen får inte somna - då slutar accelerometern mäta

  const [now, setNow] = useState(() => Date.now())
  const [showClock, setShowClock] = useState(false)
  const stopNag = useRef(null)

  const task = current.task
  const state = timerState(current, now)
  const [outer, inner] = timers
  const other = timers.find((timer) => timer !== current) ?? null

  useEffect(() => {
    const tick = () => setNow(Date.now())
    const interval = setInterval(tick, 250)
    // Tillbaka från bakgrunden: synka direkt i stället för att vänta på ticket
    const subscription = AppState.addEventListener('change', (appState) => {
      if (appState === 'active') tick()
    })
    return () => {
      clearInterval(interval)
      subscription.remove()
    }
  }, [])

  const shade = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(shade, { toValue: state.expired ? SHADE : 0, duration: 250, useNativeDriver: true }).start()
    onFocusChange(state.expired)
  }, [state.expired])
  useEffect(() => () => onFocusChange(false), [])

  // Kopian i Library/Sounds finns bara på iOS - annars spelas den sparade inspelningen
  const source = useMemo(() => localSoundUri(task.id) ?? task.filePath, [task.id, task.filePath])

  // När tiden går ut börjar rösten tjata
  useEffect(() => {
    if (!state.expired) return
    let cancelled = false

    // Ljudfilen om den finns, annars läser telefonens röst upp titeln
    const nag = source ? playNag(source, task.snoozeCount) : speakNag(task.title, task.snoozeCount)
    nag.then((stop) => {
      if (cancelled) stop()
      else stopNag.current = stop
    })

    return () => {
      cancelled = true
      stopNag.current?.()
    }
  }, [state.expired, source, task.title, task.snoozeCount])

  // Själva snooze-tiden räknas ut i HemScreen, som också bokar om notisen
  function handleSnooze() {
    stopNag.current?.()
    onSnooze()
  }

  function handleDone() {
    stopNag.current?.()
    onDone()
  }

  // Texten i mitten gäller alltid tjatet som tar slut först
  const centerLabel = showClock && !state.expired ? clockTime(state.secondsLeft) : timerLabel(state)

  const arming = guard.phase === 'arming'
  const otherState = other && timerState(other, now)

  return (
    <View style={styles.wrapper}>
      <View>
        <Ring timer={outer} state={timerState(outer, now)} label={inner ? '' : centerLabel} green={colors.ok} />

        {inner && (
          <>
            <View pointerEvents="none" style={styles.inner}>
              <Ring timer={inner} state={timerState(inner, now)} label="" green={INNER_GREEN} />
            </View>
            <View pointerEvents="none" style={styles.centerLabel}>
              <Text style={styles.centerText}>{centerLabel}</Text>
            </View>
          </>
        )}

        {state.late && (
          <View pointerEvents="none" style={styles.stampWrap}>
            <View style={styles.stamp}>
              <Text style={styles.stampText}>FÖRSENAD</Text>
            </View>
          </View>
        )}

        <Pressable style={styles.cornerBtn} onPress={() => setShowClock((shown) => !shown)}>
          {showClock ? <TimerIcon color={colors.muted} /> : <ClockIcon color={colors.muted} />}
        </Pressable>

        {/* Vakten går att slå på även när tiden redan går - knappen blinkar som påminnelse */}
        <GuardButton guard={guard} blinkSeed={task.id} />
      </View>

      {/* Samma höjd som formulärets knapprad, annars hoppar ringen */}
      <View style={styles.titleRow}>
        {arming ? (
          <Text style={[styles.title, styles.guardText]} numberOfLines={1}>
            Lägg mobilen på bordet … {guard.armLeft}
          </Text>
        ) : (
          <>
            <Text style={[styles.title, other && styles.titleFirst]} numberOfLines={1}>
              {task.title}
            </Text>
            {other && (
              <Text style={styles.titleNext} numberOfLines={1}>
                sedan: {other.task.title} · {timerLabel(otherState)}
              </Text>
            )}
          </>
        )}
      </View>

      {/* Belöningen mitt i tjatet: hur många gånger det redan är klarat */}
      {task.doneCount > 0 && (
        <View style={styles.holo}>
          <HoloText text={`Klarat ${task.doneCount} ggr`} seed={task.id} />
        </View>
      )}

      {/* Skuggan ligger över allt som ritats före den, men under knapparna */}
      <Animated.View pointerEvents={state.expired ? 'auto' : 'none'} style={[styles.shade, { opacity: shade }]} />

      {/* Klart går alltid - även för sent. Snooza först när tiden är ute. */}
      <View style={styles.buttons}>
        <Pressable style={[styles.btn, styles.done]} onPress={handleDone}>
          <Text style={styles.btnText}>Klart</Text>
        </Pressable>
        {state.expired && (
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
  // Långt utanför ringen åt alla håll, så att den täcker hela skärmen
  shade: { position: 'absolute', top: -2000, bottom: -2000, left: -1000, right: -1000, backgroundColor: colors.text },
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
  // Den inre ringen ritas i full storlek och krymps runt mitten
  inner: { position: 'absolute', top: 0, left: 0, width: SIZE, height: SIZE, transform: [{ scale: INNER_SCALE }] },
  centerLabel: { position: 'absolute', top: 0, left: 0, width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  centerText: { fontSize: 30, fontWeight: '700', color: colors.text },
  titleRow: { height: 46, justifyContent: 'center', alignItems: 'center' },
  title: { color: colors.muted, fontSize: 15 },
  titleFirst: { color: colors.text, fontWeight: '600' },
  titleNext: { color: colors.muted, fontSize: 13, marginTop: 2 },
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
