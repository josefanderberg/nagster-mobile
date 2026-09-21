import { useCallback, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getTasks, fileUrl } from '../api.js'
import { formatDuration } from '../time.js'
import { colors } from '../theme.js'

function HemScreen({ navigation }) {
  const [tasks, setTasks] = useState([])
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(() => {
    setRefreshing(true)
    getTasks()
      .then((data) => {
        setTasks(data)
        setError(null)
      })
      .catch((err) => setError(err.message))
      .finally(() => setRefreshing(false))
  }, [])

  // Hämta om listan varje gång skärmen visas (t.ex. efter Klart/Snooze)
  useFocusEffect(load)

  function openTask(task) {
    navigation.navigate('Vakt', {
      taskId: task.id,
      title: task.title,
      seconds: task.durationSeconds,
      snoozeCount: task.snoozeCount,
      audioSource: task.filePath ? fileUrl(task.filePath) : null,
      guard: false,
    })
  }

  return (
    <View style={styles.screen}>
      {error && <Text style={styles.error}>⚠️ {error}</Text>}

      <FlatList
        data={tasks}
        keyExtractor={(task) => String(task.id)}
        refreshing={refreshing}
        onRefresh={load}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          !error && <Text style={styles.empty}>Inget att tjata om än. Tryck på + där nere!</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, item.status === 'done' && styles.cardDone]}
            onPress={() => item.status !== 'done' && openTask(item)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>
                {item.status === 'done' ? '✓ Klart' : formatDuration(item.durationSeconds)}
                {item.snoozeCount > 0 && `  ·  😤 snoozad ${item.snoozeCount} ggr`}
                {item.filePath && '  ·  🎙️'}
              </Text>
            </View>
            {item.status !== 'done' && <Text style={styles.chevron}>▶</Text>}
          </Pressable>
        )}
      />

      <Pressable style={styles.fab} onPress={() => navigation.navigate('NyttTjat')}>
        <Text style={styles.fabText}>＋</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  error: {
    color: colors.accent,
    backgroundColor: '#2a1512',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 48, fontSize: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  cardDone: { opacity: 0.45 },
  title: { color: colors.text, fontSize: 17, fontWeight: '600' },
  meta: { color: colors.muted, marginTop: 4 },
  chevron: { color: colors.accent, fontSize: 18, marginLeft: 12 },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: { color: '#fff', fontSize: 30, lineHeight: 34 },
})

export default HemScreen
