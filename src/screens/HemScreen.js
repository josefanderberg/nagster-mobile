import { useCallback, useEffect, useRef, useState } from 'react'
import { FlatList, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import * as Notifications from 'expo-notifications'
import { createTask, getTasks, restartTask, saveRecording, updateTask } from '../store.js'
import { cancelAlarm, ensureNotificationPermission, scheduleAlarm } from '../notifications.js'
import { localSoundUri, saveLocalSound, soundName } from '../sounds.js'
import { clearActive, loadActive, saveActive } from '../activeStore.js'
import TaskForm from '../components/TaskForm.js'
import ActiveTimer from '../components/ActiveTimer.js'
import TaskCard from '../components/TaskCard.js'
import ErrorBanner from '../components/ErrorBanner.js'
import GuardScreen from '../components/GuardScreen.js'
import { useMotionGuard } from '../useMotionGuard.js'
import { isSecondsMode } from '../timerRing.js'
import { showDoneIcon, showNaggingIcon } from '../appIcon.js'
import { File, Paths } from 'expo-file-system'
import { speakToFile } from '../../modules/tjat-native/index.js'
import { colors } from '../theme.js'

const SNOOZE_MINUTES = 10

function HemScreen({ navigation, route }) {
  const [tasks, setTasks] = useState([])
  const [active, setActive] = useState(null) // bara ett tjat åt gången
  const [endsAt, setEndsAt] = useState(null) // fast sluttid, överlever bakgrund
  const [deadline, setDeadline] = useState(null) // första sluttiden, flyttas inte av snooze
  const [restored, setRestored] = useState(false)
  const [error, setError] = useState(null)
  // Vakten bor här och inte i formuläret, så att den lever vidare när ett tjat startas
  const guard = useMotionGuard(active ? localSoundUri(active.id) : null)

  const load = useCallback(() => {
    return getTasks()
      .then((data) => {
        setTasks(data)
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

  // Återupptar ett pågående tjat efter att appen startats om
  useEffect(() => {
    const saved = loadActive()
    if (!saved) {
      setRestored(true)
      return
    }
    getTasks()
      .then((data) => {
        setTasks(data)
        const task = data.find((item) => item.id === saved.taskId)
        if (task && task.status === 'pending') {
          // Även en passerad sluttid återställs - timern visar 0 och tjatar
          setActive(task)
          setEndsAt(saved.endsAt)
          setDeadline(saved.deadline ?? saved.endsAt) // äldre minnen saknar deadline
        } else {
          clearActive()
        }
      })
      .catch(() => {}) // går listan inte att läsa visar fokus-effekten felet
      .finally(() => setRestored(true))
  }, [])

  // Avslutar det aktiva tjatet: inga fler notiser och inget sparat minne
  function stopActive() {
    setActive(null)
    setEndsAt(null)
    setDeadline(null)
    cancelAlarm()
    clearActive()
  }

  // Gemensamt för nya tjat och omkörda: boka notisen och starta timern.
  // sound är filnamnet i Library/Sounds, eller null för systemljudet.
  async function startTimer(task, seconds, sound) {
    const ends = Date.now() + seconds * 1000
    if (await ensureNotificationPermission()) await scheduleAlarm(task, ends, sound)

    showNaggingIcon()
    setActive(task)
    setEndsAt(ends)
    setDeadline(ends)
    saveActive(task.id, ends, ends)
    await load()
  }

  async function handleAdd(title, seconds, recording) {
    try {
      // Uppgiften skapas först, sedan kopplas inspelningen till den
      let task = await createTask({ title, durationSeconds: seconds })

      // Ett skrivet tjat utan inspelning läses in med telefonens röst, och
      // filen används sedan precis som en inspelning
      const voice = recording ?? (await speakToFile(title, new File(Paths.cache, `tal-${task.id}.wav`).uri))
      if (voice) task = await saveRecording(task.id, voice)

      // Lokal kopia i Library/Sounds gör att notisen tjatar med rösten
      await startTimer(task, seconds, voice ? saveLocalSound(task.id, voice) : null)
    } catch (err) {
      setError(err.message)
    }
  }

  // Ett gammalt tjat körs igen med samma röst. Notisljudet finns kvar i
  // Library/Sounds sedan förra gången.
  async function handleRerun(id, seconds) {
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

  // Snooze ger tio minuter till - eller samma antal sekunder igen om tjatet
  // sattes i sekunder, så att man kan visa upp det snabbt.
  async function handleSnooze() {
    const snoozed = { ...active, snoozeCount: active.snoozeCount + 1 }
    const extraSeconds = isSecondsMode(active.durationSeconds) ? active.durationSeconds : SNOOZE_MINUTES * 60
    const ends = Date.now() + extraSeconds * 1000

    setActive(snoozed)
    setEndsAt(ends)
    saveActive(snoozed.id, ends, deadline)
    try {
      await scheduleAlarm(snoozed, ends, localSoundUri(snoozed.id) ? soundName(snoozed.id) : null)
      await updateTask(snoozed.id, snoozed)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  // Klart räknar upp hur många gånger tjatet klarats och sparar hur sent det
  // blev - räknat från första sluttiden, så varje snooze gör det senare
  async function handleDone() {
    const finished = {
      ...active,
      status: 'done',
      doneCount: (active.doneCount ?? 0) + 1,
      lateSeconds: Math.max(0, Math.floor((Date.now() - deadline) / 1000)),
    }
    stopActive()
    showDoneIcon()
    try {
      await updateTask(finished.id, finished)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  // Knapptryck på notisen: Klart eller Snooza. Hooken fångar även trycket
  // som startade appen kallt, därför väntar vi in återställningen först.
  const lastResponse = Notifications.useLastNotificationResponse()
  const handledResponse = useRef(null)

  useEffect(() => {
    if (!restored || !lastResponse || !active) return
    if (lastResponse.notification.request.content.data?.taskId !== active.id) return
    const id = lastResponse.notification.request.identifier
    if (handledResponse.current === id) return
    handledResponse.current = id

    if (lastResponse.actionIdentifier === 'done') handleDone()
    else if (lastResponse.actionIdentifier === 'snooze') handleSnooze()
    // ett vanligt tryck öppnar bara appen
  }, [restored, lastResponse, active])

  return (
    <View style={styles.screen}>
      <ErrorBanner message={error} onRetry={load} />

      {/* Tryck utanför textrutan fäller ner tangentbordet, så Starta syns igen */}
      <Pressable style={styles.hero} onPress={Keyboard.dismiss} accessible={false}>
        {active ? (
          <ActiveTimer task={active} endsAt={endsAt} deadline={deadline} guard={guard} onDone={handleDone} onSnooze={handleSnooze} />
        ) : (
          <TaskForm onAdd={handleAdd} onError={setError} guard={guard} />
        )}
      </Pressable>

      <GuardScreen phase={guard.phase} onDisarm={guard.disarm} />

      <FlatList
        style={styles.history}
        contentContainerStyle={styles.historyContent}
        data={tasks}
        keyExtractor={(task) => String(task.id)}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            isActive={item.id === active?.id}
            onCancel={stopActive}
            // Det pågående tjatet är låst, och bara ett tjat åt gången kan köras
            onPress={() =>
              navigation.navigate('Detalj', {
                task: item,
                isActive: item.id === active?.id,
                canRerun: !active,
              })
            }
          />
        )}
        ListEmptyComponent={!error && <Text style={styles.empty}>Inget att tjata om än.</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  history: { flexGrow: 0, maxHeight: 210 },
  historyContent: { gap: 10, paddingBottom: 16 },
  empty: { textAlign: 'center', color: colors.muted, paddingVertical: 24 },
})

export default HemScreen
