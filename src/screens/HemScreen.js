import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Alert, Animated, FlatList, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import * as Notifications from 'expo-notifications'
import { breakStreak, createTask, deleteTask, getSettings, getStreak, getTasks, recordCompletion, restartTask, saveRecording, saveSetting, updateTask } from '../store.js'
import { cancelAlarm, ensureNotificationPermission, scheduleAlarm } from '../notifications.js'
import { deleteLocalSound, localSoundUri, saveLocalSound, soundName } from '../sounds.js'
import { loadTimers, saveTimers } from '../activeStore.js'
import TaskForm from '../components/TaskForm.js'
import ActiveTimer from '../components/ActiveTimer.js'
import TaskCard from '../components/TaskCard.js'
import SwipeRow from '../components/SwipeRow.js'
import ErrorBanner from '../components/ErrorBanner.js'
import GuardScreen from '../components/GuardScreen.js'
import StreakBadge from '../components/StreakBadge.js'
import GotchaCamera from '../components/GotchaCamera.js'
import { CameraIcon } from '../components/icons.js'
import { Camera } from 'expo-camera'
import { useMotionGuard } from '../useMotionGuard.js'
import { DEFAULT_SNOOZE_SECONDS } from '../snooze.js'
import { showDoneIcon, showNaggingIcon } from '../appIcon.js'
import { previewNag } from '../nag.js'
import * as Haptics from 'expo-haptics'
import { File, Paths } from 'expo-file-system'
import { speakToFile, transcribe } from '../../modules/tjat-native/index.js'
import { titleFromSpeech } from '../title.js'
import { colors, lightText, shaded } from '../theme.js'

const DEFAULT_TITLE = 'Inspelat tjat' // när inget gick att höra
const MAX_TIMERS = 2 // ett tjat, plus ett till i en inre ring
const LIST_HEIGHT = 210 // listans plats på skärmen, som förut

// Det tjat som tar slut först - det är det Klart och Snooza gäller
function firstToEnd(timers) {
  return timers.reduce((first, timer) => (first === null || timer.endsAt < first.endsAt ? timer : first), null)
}

function HemScreen({ navigation, route }) {
  const [tasks, setTasks] = useState([])
  // Pågående tjat: { task, endsAt, deadline }, i startordning. endsAt är en fast
  // sluttid som överlever bakgrund, deadline den första som snooze inte flyttar.
  const [timers, setTimers] = useState([])
  const [restored, setRestored] = useState(false)
  const [error, setError] = useState(null)
  const [streak, setStreak] = useState(() => getStreak())
  const [gotchaOn, setGotchaOn] = useState(() => getSettings().gotchaCamera === true)
  const [gotcha, setGotcha] = useState(null) // { kind, taskId } medan kameran tar en bild
  // Tjatet som just ändrats blinkar till i listan. key gör att samma tjat kan blinka igen.
  const [flash, setFlash] = useState({ id: null, key: 0 })
  const flashTask = (id) => setFlash((previous) => ({ id, key: previous.key + 1 }))
  const current = firstToEnd(timers)
  // Skärmen är mörk medan ett tjat går, så att bara det som gäller syns.
  // När tiden är ute (expired) gäller bara Klart och Snooza.
  const dark = timers.length > 0
  const [expired, setExpired] = useState(false)
  const shade = useRef(new Animated.Value(0)).current
  // Luckan mellan timern och listan halveras genom att listan sträcker sig
  // upp i luckans nedre halva. Timern centreras som förut och står kvar.
  const [heroHeight, setHeroHeight] = useState(0)
  const [contentHeight, setContentHeight] = useState(0)
  const [listHeight, setListHeight] = useState(0)
  const lift = Math.max(0, (heroHeight - contentHeight) / 4)
  // Vakten bor här och inte i formuläret, så att den lever vidare när ett tjat startas
  const guard = useMotionGuard(current ? localSoundUri(current.task.id) : null, current?.endsAt ?? null)

  // Ändrar listan och sparar den, så att en dödad app kan ta upp tråden
  function updateTimers(change) {
    setTimers((previous) => {
      const next = change(previous)
      saveTimers(next)
      return next
    })
  }

  // Timern har en egen kopia av tjatet. Har titeln bytts - i detaljvyn,
  // eller när talet tolkats klart - får timern och notisen den nya.
  const timersRef = useRef(timers)
  timersRef.current = timers
  function syncTitles(data) {
    for (const timer of timersRef.current) {
      const fresh = data.find((task) => task.id === timer.task.id)
      if (!fresh || fresh.title === timer.task.title) continue
      const renamed = { ...timer.task, title: fresh.title }
      updateTimers((previous) => previous.map((item) => (item.task.id === renamed.id ? { ...item, task: renamed } : item)))
      scheduleAlarm(renamed, timer.endsAt, localSoundUri(renamed.id) ? soundName(renamed.id) : null).catch(() => {})
    }
  }

  const load = useCallback(() => {
    return getTasks()
      .then((data) => {
        setTasks(data)
        syncTitles(data)
        setError(null)
      })
      .catch((err) => setError(err.message))
  }, [])

  // Hämtar listan varje gång skärmen visas. Effekten får inte returnera
  // load():s promise - bara en eventuell städfunktion - därav klamrarna.
  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  // Återupptar pågående tjat efter att appen startats om
  useEffect(() => {
    const saved = loadTimers()
    if (saved.length === 0) {
      setRestored(true)
      return
    }
    getTasks()
      .then((data) => {
        setTasks(data)
        // Även en passerad sluttid återställs - timern visar 0 och tjatar
        const alive = saved
          .map((timer) => ({ ...timer, task: data.find((item) => item.id === timer.taskId) }))
          .filter((timer) => timer.task?.status === 'pending')
          .map(({ task, endsAt, deadline }) => ({ task, endsAt, deadline }))
        updateTimers(() => alive)
      })
      .catch(() => {}) // går listan inte att läsa visar fokus-effekten felet
      .finally(() => setRestored(true))
  }, [])

  // Avslutar ett pågående tjat: inga fler notiser och borta ur minnet
  function stopTimer(taskId) {
    updateTimers((previous) => previous.filter((timer) => timer.task.id !== taskId))
    cancelAlarm(taskId)
  }

  // Gemensamt för nya tjat och omkörda: boka notisen och starta timern.
  // Går redan ett tjat hamnar det nya i en inre ring. sound är filnamnet
  // i Library/Sounds, eller null för systemljudet.
  async function startTimer(task, seconds, sound) {
    const ends = Date.now() + seconds * 1000
    if (await ensureNotificationPermission()) await scheduleAlarm(task, ends, sound)

    updateTimers((previous) => [...previous, { task, endsAt: ends, deadline: ends }].slice(-MAX_TIMERS))
    await load()
    flashTask(task.id)
  }

  async function handleAdd(typedTitle, seconds, recording) {
    try {
      // Uppgiften skapas först, sedan kopplas inspelningen till den
      const title = typedTitle || DEFAULT_TITLE
      let task = await createTask({ title, durationSeconds: seconds })

      // Ett skrivet tjat utan inspelning läses in med telefonens röst, och
      // filen används sedan precis som en inspelning
      const voice = recording ?? (await speakToFile(title, new File(Paths.cache, `tal-${task.id}.wav`).uri))
      if (voice) task = await saveRecording(task.id, voice)

      // Lokal kopia i Library/Sounds gör att notisen tjatar med rösten
      await startTimer(task, seconds, voice ? saveLocalSound(task.id, voice) : null)

      // Utan skriven titel lyssnar telefonen på inspelningen och gör en titel
      // av det viktiga - så att inte alla tjat heter "Inspelat tjat". Tjatet
      // väntar inte på det, titeln byts när tolkningen är klar.
      if (!typedTitle && recording) nameFromSpeech(task.id, task.filePath)
    } catch (err) {
      setError(err.message)
    }
  }

  async function nameFromSpeech(id, recording) {
    const heard = titleFromSpeech(await transcribe(recording))
    if (!heard) return
    try {
      await updateTask(id, { title: heard })
      await load()
      flashTask(id)
    } catch {
      // tjatet hann tas bort - då finns inget att döpa
    }
  }

  // Ett gammalt tjat körs igen med samma röst. Notisljudet finns kvar i
  // Library/Sounds sedan förra gången.
  async function handleRerun(id, seconds) {
    if (timers.length >= MAX_TIMERS) return setError('Två tjat åt gången räcker - bli klar med ett först.')
    try {
      const task = await restartTask(id, seconds)
      await startTimer(task, seconds, localSoundUri(id) ? soundName(id) : null)
    } catch (err) {
      setError(err.message)
    }
  }

  // "Kör igen" i detaljvyn hoppar tillbaka hit med tjatet som parameter.
  // Parametern töms direkt, annars körs tjatet om igen vid nästa besök.
  const rerun = route.params?.rerun
  useEffect(() => {
    if (!rerun) return
    navigation.setParams({ rerun: undefined })
    handleRerun(rerun.id, rerun.seconds)
  }, [rerun])

  // Snooze och Mer tid ger den tid man valde, eller två minuter om man inte
  // valde något (som från notisens knapp). Gäller tjatet som tar slut först,
  // om inte notisen pekade ut ett annat.
  async function handleSnooze(timer = current, extraSeconds = DEFAULT_SNOOZE_SECONDS) {
    if (!timer) return
    const snoozed = { ...timer.task, snoozeCount: timer.task.snoozeCount + 1 }
    // Mer tid läggs på det som är kvar - ber man om det innan tiden är ute
    // ska man inte få mindre tid
    const ends = Math.max(timer.endsAt, Date.now()) + extraSeconds * 1000

    showNaggingIcon() // ikonen blir arg först när man skjuter upp
    if (gotchaOn) setGotcha({ kind: 'snooze', taskId: snoozed.id })
    updateTimers((previous) =>
      previous.map((item) => (item.task.id === snoozed.id ? { ...item, task: snoozed, endsAt: ends } : item))
    )
    try {
      await scheduleAlarm(snoozed, ends, localSoundUri(snoozed.id) ? soundName(snoozed.id) : null)
      await updateTask(snoozed.id, { snoozeCount: snoozed.snoozeCount })
      await load()
      flashTask(snoozed.id)
    } catch (err) {
      setError(err.message)
    }
  }

  // Mer tid innan tiden är ute är ingen snooze: man tog sig tiden i tid, så
  // ingen arg ikon, ingen bild och ingen försening - sluttiden som förseningen
  // räknas från flyttas också. Är tjatet redan försenat är det en snooze.
  async function handleMoreTime(timer = current, extraSeconds = DEFAULT_SNOOZE_SECONDS) {
    if (!timer) return
    if (Date.now() >= timer.deadline) return handleSnooze(timer, extraSeconds)
    const ends = Math.max(timer.endsAt, Date.now()) + extraSeconds * 1000

    updateTimers((previous) =>
      previous.map((item) => (item.task.id === timer.task.id ? { ...item, endsAt: ends, deadline: ends } : item))
    )
    try {
      await scheduleAlarm(timer.task, ends, localSoundUri(timer.task.id) ? soundName(timer.task.id) : null)
      flashTask(timer.task.id)
    } catch (err) {
      setError(err.message)
    }
  }

  // Klart räknar upp hur många gånger tjatet klarats och sparar hur sent det
  // blev - räknat från första sluttiden, så varje snooze gör det senare.
  // Bara i tid ger glad ikon och håller streaken vid liv.
  // Gäller tjatet som tar slut först - ett eventuellt andra fortsätter ensamt.
  async function handleDone(timer = current) {
    if (!timer) return
    const lateSeconds = Math.max(0, Math.floor((Date.now() - timer.deadline) / 1000))
    const onTime = Date.now() <= timer.deadline
    const finished = {
      ...timer.task,
      status: 'done',
      doneCount: (timer.task.doneCount ?? 0) + 1,
      lateSeconds,
    }
    stopTimer(finished.id)
    setStreak(recordCompletion(onTime))
    if (gotchaOn) setGotcha({ kind: onTime ? 'done' : 'late', taskId: finished.id })
    if (onTime) showDoneIcon()
    else showNaggingIcon()
    try {
      await updateTask(finished.id, { status: 'done', doneCount: finished.doneCount, lateSeconds })
      await load()
      flashTask(finished.id)
    } catch (err) {
      setError(err.message)
    }
  }

  // Svep vänster i listan: borta för gott, därför en bekräftelse först
  function confirmDelete(task) {
    Alert.alert('Ta bort tjatet?', 'Inspelningen och bilderna raderas också.', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Ta bort',
        style: 'destructive',
        onPress: () =>
          deleteTask(task.id)
            .then(() => {
              deleteLocalSound(task.id) // den lokala notisljudskopian ska också bort
              return load()
            })
            .catch((err) => setError(err.message)),
      },
    ])
  }

  // Ertappad-kameran slås på och av uppe till höger. Kameran behöver lov
  // först - utan det förblir den av.
  async function toggleGotcha() {
    const next = !gotchaOn
    if (next) {
      // Frågan finns bara på Camera-objektet - den exporteras inte för sig
      const { granted } = await Camera.requestCameraPermissionsAsync().catch(() => ({ granted: false }))
      if (!granted) return setError('Tjat behöver kameran för att ta en bild när du snoozar eller klarar ett tjat. Slå på den under Inställningar > Tjat.')
    }
    saveSetting('gotchaCamera', next)
    setGotchaOn(next)
    if (next) {
      Alert.alert(
        'Ertappad-kameran är på',
        'Frontkameran tar en bild när du snoozar eller klarar ett tjat. Alla bilder sparas bara i din telefon och skickas aldrig någonstans.'
      )
    }
  }

  // Blir ett tjat försenat är streaken borta direkt - samtidigt som
  // FÖRSENAD-stämpeln dyker upp, utan att vänta på att man trycker Klart
  useEffect(() => {
    if (streak === 0 || timers.length === 0) return
    const lateAt = Math.min(...timers.map((timer) => timer.deadline))
    const timeout = setTimeout(() => setStreak(breakStreak()), Math.max(0, lateAt - Date.now()))
    return () => clearTimeout(timeout)
  }, [timers, streak])

  // Bakgrunden glider över till mörk när ett tjat startar, och tillbaka
  useEffect(() => {
    Animated.timing(shade, { toValue: dark ? 1 : 0, duration: 250, useNativeDriver: false }).start()
  }, [dark, shade])
  const background = shade.interpolate({ inputRange: [0, 1], outputRange: [colors.bg, shaded(colors.bg)] })

  // Streaken uppe till vänster, kameran uppe till höger. Rubrikraden
  // mörknar med resten medan ett tjat går.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: dark ? shaded(colors.bg) : colors.bg },
      headerTintColor: dark ? lightText : colors.text,
      headerLeft: () => <StreakBadge count={streak} color={dark ? lightText : colors.text} />,
      // På iOS 26 hamnar hörnen annars i en glasbubbla som ser ut som en knapp
      unstable_headerLeftItems: () => [
        { type: 'custom', element: <StreakBadge count={streak} color={dark ? lightText : colors.text} />, hidesSharedBackground: true },
      ],
      headerRight: () => (
        <Pressable
          onPress={toggleGotcha}
          hitSlop={8}
          accessibilityLabel={gotchaOn ? 'Stäng av ertappad-kameran' : 'Slå på ertappad-kameran'}
        >
          <CameraIcon color={gotchaOn ? colors.accent : colors.muted} off={!gotchaOn} />
        </Pressable>
      ),
    })
  }, [navigation, streak, gotchaOn, dark])

  // Knapptryck på notisen: Klart eller Snooza. Hooken fångar även trycket
  // som startade appen kallt, därför väntar vi in återställningen först.
  const lastResponse = Notifications.useLastNotificationResponse()
  const handledResponse = useRef(null)

  useEffect(() => {
    if (!restored || !lastResponse) return
    const timer = timers.find((item) => item.task.id === lastResponse.notification.request.content.data?.taskId)
    if (!timer) return
    const id = lastResponse.notification.request.identifier
    if (handledResponse.current === id) return
    handledResponse.current = id

    if (lastResponse.actionIdentifier === 'done') handleDone(timer)
    else if (lastResponse.actionIdentifier === 'snooze') handleSnooze(timer)
    // ett vanligt tryck öppnar bara appen
  }, [restored, lastResponse, timers])

  return (
    <Animated.View style={[styles.screen, { backgroundColor: background }]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <ErrorBanner message={error} onRetry={load} />

      {/* Tryck utanför textrutan fäller ner tangentbordet, så Starta syns igen */}
      <Pressable
        style={styles.hero}
        onPress={Keyboard.dismiss}
        onLayout={(event) => setHeroHeight(event.nativeEvent.layout.height)}
        accessible={false}
      >
        <View onLayout={(event) => setContentHeight(event.nativeEvent.layout.height)}>
          {timers.length > 0 ? (
            <ActiveTimer
              timers={timers}
              current={current}
              guard={guard}
              onDone={() => handleDone()}
              onMoreTime={(seconds) => handleMoreTime(current, seconds)}
              onSnooze={(seconds) => handleSnooze(current, seconds)}
              onFocusChange={setExpired}
            />
          ) : (
            <TaskForm onAdd={handleAdd} onError={setError} guard={guard} />
          )}
        </View>
      </Pressable>

      <GuardScreen
        phase={guard.phase}
        onDisarm={guard.disarm}
        hasTimer={timers.length > 0}
        timer={current}
        onDone={() => {
          guard.disarm()
          handleDone()
        }}
      />
      <GotchaCamera shot={gotcha} onSaved={load} onClose={() => setGotcha(null)} />

      {/* Listan tar samma plats som förut, men ritas en bit högre upp. När
          tiden är ute går den inte att trycka på - då gäller bara Klart och Snooza. */}
      <View style={{ height: Math.min(listHeight, LIST_HEIGHT) }} pointerEvents={expired ? 'none' : 'auto'}>
        <FlatList
          style={[styles.history, { top: -lift }]}
          contentContainerStyle={styles.historyContent}
          onContentSizeChange={(_, height) => setListHeight(height)}
          data={tasks}
          keyExtractor={(task) => String(task.id)}
          renderItem={({ item }) => {
            // Pågående tjat är låsta, och högst två kan gå samtidigt
            const isActive = timers.some((timer) => timer.task.id === item.id)
            const canRun = !isActive && timers.length < MAX_TIMERS
            const run = canRun ? () => handleRerun(item.id, item.durationSeconds) : null
            // Svep höger kör igen, vänster tar bort - ett pågående tjat går inte att ta bort
            return (
              <SwipeRow onSwipeRight={run} onSwipeLeft={isActive ? null : () => confirmDelete(item)}>
                <TaskCard
                  task={item}
                  isActive={isActive}
                  // Medan ett tjat går tonas de andra ner - när tiden är ute även det pågående
                  dimmed={dark && (expired || !isActive)}
                  onCancel={() => stopTimer(item.id)}
                  onRun={run}
                  onPreview={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                    previewNag(localSoundUri(item.id) ?? item.filePath, item.title)
                  }}
                  onPress={() => navigation.navigate('Detalj', { task: item, isActive, canRerun: canRun })}
                  flashKey={flash.id === item.id ? flash.key : 0}
                />
              </SwipeRow>
            )
          }}
          ListEmptyComponent={!error && <Text style={styles.empty}>Inget att tjata om än.</Text>}
        />
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  history: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  historyContent: { gap: 10, paddingBottom: 16 },
  empty: { textAlign: 'center', color: colors.muted, paddingVertical: 24 },
})

export default HemScreen
