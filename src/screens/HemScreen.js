import { useCallback, useState } from 'react'
import { FlatList, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { createTask, getTasks, updateTask, uploadRecording } from '../api.js'
import TaskForm from '../components/TaskForm.js'
import ActiveTimer from '../components/ActiveTimer.js'
import TaskCard from '../components/TaskCard.js'
import ErrorBanner from '../components/ErrorBanner.js'
import { colors } from '../theme.js'

function HemScreen({ navigation }) {
  const [tasks, setTasks] = useState([])
  const [active, setActive] = useState(null) // bara ett tjat åt gången
  const [guard, setGuard] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    return getTasks()
      .then((data) => {
        setTasks(data)
        setError(null)
      })
      .catch((err) => setError(err.message))
  }, [])

  // Hämtar listan varje gång skärmen visas. Effekten får inte returnera
  // load():s promise – bara en eventuell städfunktion – därav klamrarna.
  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  async function handleAdd(title, seconds, recording, withGuard) {
    try {
      // Uppgiften skapas först, sedan kopplas inspelningen till den.
      // Svaret från uppladdningen innehåller sökvägen till ljudet.
      let task = await createTask({ title, durationSeconds: seconds })
      if (recording) task = await uploadRecording(task.id, recording)
      setGuard(withGuard)
      setActive(task)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSnooze() {
    const snoozed = { ...active, snoozeCount: active.snoozeCount + 1 }
    setActive(snoozed)
    try {
      await updateTask(snoozed.id, snoozed)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDone() {
    const finished = { ...active, status: 'done' }
    setActive(null)
    try {
      await updateTask(finished.id, finished)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <View style={styles.screen}>
      <ErrorBanner message={error} onRetry={load} />

      {/* Tryck utanför textrutan fäller ner tangentbordet, så Starta syns igen */}
      <Pressable style={styles.hero} onPress={Keyboard.dismiss} accessible={false}>
        {active ? (
          <ActiveTimer task={active} guard={guard} onDone={handleDone} onSnooze={handleSnooze} />
        ) : (
          <TaskForm onAdd={handleAdd} onError={setError} />
        )}
      </Pressable>

      <FlatList
        style={styles.history}
        contentContainerStyle={styles.historyContent}
        data={tasks}
        keyExtractor={(task) => String(task.id)}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            isActive={item.id === active?.id}
            onCancel={() => setActive(null)}
            onPress={() => navigation.navigate('Detalj', { task: item })}
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
