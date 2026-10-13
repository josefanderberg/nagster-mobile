import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, AppState, Pressable, StyleSheet, Text, View } from 'react-native'
import { useKeepAwake } from 'expo-keep-awake'
import TimerRing from './TimerRing.js'
import HoloText from './HoloText.js'
import GuardButton from './GuardButton.js'
import SnoozeChoices from './SnoozeChoices.js'
import { ClockIcon, TimerIcon } from './icons.js'
import { localSoundUri } from '../sounds.js'
import { playNag, speakNag } from '../nag.js'
import { isSecondsMode, SIZE } from '../timerRing.js'
import { clockTime, timerLabel, timerState } from '../time.js'
import { useSnoozeChoice } from '../useSnoozeChoice.js'
import { colors, DIMMED, lightMuted, lightText } from '../theme.js'

const INNER_SCALE = 0.64 // den inre ringen får plats innanför den yttre
const INNER_GREEN = '#3fb6a8' // lite blågrönare, så att ringarna går att skilja åt

// En ring per tjat: grön nedräkning, eller röd uppräkning när tiden är ute
function Ring({ timer, state, label, green }) {
  return state.expired ? (
    <TimerRing units={state.lateSeconds} label={label} labelColor={lightText} color={colors.accentDark} interactive={false} />
  ) : (
    <TimerRing
      units={state.secondsLeft}
      label={label}
      labelColor={lightText}
      color={green}
      mirrored={isSecondsMode(timer.task.durationSeconds)}
      interactive={false}
    />
  )
}

// Tjaten som är igång: ringarna räknar ner och går inte att dra i. Ett varv
// är en minut, så sekundvisaren syns tydligt. Ett andra tjat syns som en
// inre ring. Klart och Mer tid/Snooza gäller det som tar slut först (current).
// Skärmen är mörk medan tjatet går. När tiden är ute tonas även ringen ner,
// så att bara knapparna gäller - onFocusChange berättar det för skärmen.
// onSnooze får antalet sekunder man valde.
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

  const dim = useRef(new Animated.Value(1)).current
  const choice = useSnoozeChoice((seconds) => onSnooze(seconds))
  useEffect(() => {
    Animated.timing(dim, { toValue: state.expired ? DIMMED : 1, duration: 250, useNativeDriver: true }).start()
    onFocusChange(state.expired)
    choice.close() // valen för "Mer tid" gäller inte längre när tiden gått ut
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

  // Mer tid och Snooza öppnar valen 1, 5 och 10 - rösten tystnar direkt.
  // HemScreen lägger på tiden och bokar om notisen.
  function askForTime() {
    stopNag.current?.()
    choice.show()
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
      <Animated.View style={{ opacity: dim }} pointerEvents={state.expired ? 'none' : 'auto'}>
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
      </Animated.View>

      {/* Samma höjd som formulärets knapprad, annars hoppar ringen */}
      <Animated.View style={[styles.titleRow, { opacity: dim }]}>
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
      </Animated.View>

      {/* Belöningen mitt i tjatet: hur många gånger det redan är klarat */}
      {task.doneCount > 0 && (
        <Animated.View style={[styles.holo, { opacity: dim }]}>
          <HoloText text={`Klarat ${task.doneCount} ggr`} seed={task.id} />
        </Animated.View>
      )}

      {/* Klart går alltid - även för sent. Mer tid medan tiden går, Snooza
          när den är ute. Båda byts mot valen 1, 5 och 10 på samma rad. */}
      {choice.open ? (
        <SnoozeChoices durationSeconds={task.durationSeconds} onPick={choice.pick} />
      ) : (
        <View style={styles.buttons}>
          <Pressable style={[styles.btn, styles.done]} onPress={handleDone}>
            <Text style={styles.btnText}>Klart</Text>
          </Pressable>
          <Pressable style={[styles.btn, state.expired ? styles.snooze : styles.more]} onPress={askForTime}>
            <Text style={styles.btnText}>{state.expired ? 'Snooza' : 'Mer tid'}</Text>
          </Pressable>
        </View>
      )}
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
  // Den inre ringen ritas i full storlek och krymps runt mitten
  inner: { position: 'absolute', top: 0, left: 0, width: SIZE, height: SIZE, transform: [{ scale: INNER_SCALE }] },
  centerLabel: { position: 'absolute', top: 0, left: 0, width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  // Ljus text - skärmen är mörk medan tjatet går
  centerText: { fontSize: 30, fontWeight: '700', color: lightText },
  titleRow: { height: 46, justifyContent: 'center', alignItems: 'center' },
  title: { color: lightMuted, fontSize: 15 },
  titleFirst: { color: lightText, fontWeight: '600' },
  titleNext: { color: lightMuted, fontSize: 13, marginTop: 2 },
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
  more: { borderWidth: 2, borderColor: lightMuted, paddingVertical: 8, paddingHorizontal: 26 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
})

export default ActiveTimer
