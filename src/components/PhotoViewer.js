import { useRef, useState } from 'react'
import { Alert, FlatList, Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { colors } from '../theme.js'

const LABELS = {
  snooze: { text: 'SNOOZE', color: '#c1121f' },
  done: { text: 'KLARAT', color: colors.ok },
  late: { text: 'TILL SLUT', color: '#f08c00' },
}

// Bevisen i helskärm: svep åt sidan för att bläddra mellan bilderna och
// ta bort den som visas. startIndex är bilden man tryckte på, eller null
// när visaren är stängd. onDelete får bilden som ska bort.
function PhotoViewer({ photos, startIndex, onClose, onDelete }) {
  const { width, height } = useWindowDimensions()
  const [index, setIndex] = useState(0)
  const list = useRef(null)
  const open = startIndex !== null && photos.length > 0
  const shown = Math.min(index, photos.length - 1)

  function confirmDelete() {
    const photo = photos[shown]
    if (!photo) return
    Alert.alert('Ta bort bilden?', 'Den går inte att få tillbaka.', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Ta bort',
        style: 'destructive',
        onPress: () => {
          // Var det den sista stängs visaren, annars visas grannen
          if (photos.length === 1) onClose()
          else if (shown === photos.length - 1) {
            setIndex(shown - 1)
            list.current?.scrollToIndex({ index: shown - 1, animated: false })
          }
          onDelete(photo)
        },
      },
    ])
  }

  return (
    <Modal visible={open} animationType="fade" onRequestClose={onClose} onShow={() => setIndex(startIndex ?? 0)}>
      <View style={styles.screen}>
        {open && (
          <FlatList
            ref={list}
            data={photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={Math.min(startIndex, photos.length - 1)}
            getItemLayout={(_, item) => ({ length: width, offset: width * item, index: item })}
            keyExtractor={(photo) => photo.name}
            onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => {
              const label = LABELS[item.kind] ?? LABELS.done
              const taken = new Date(item.at).toLocaleString('sv-SE', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })
              return (
                <View style={{ width, height }}>
                  <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  <View style={styles.caption}>
                    <Text style={[styles.label, { color: label.color, borderColor: label.color }]}>{label.text}</Text>
                    <Text style={styles.date}>{taken}</Text>
                  </View>
                </View>
              )
            }}
          />
        )}

        <View style={styles.top} pointerEvents="box-none">
          <Text style={styles.counter}>
            {shown + 1} / {photos.length}
          </Text>
          <View style={styles.actions}>
            <Pressable style={styles.pill} onPress={confirmDelete} hitSlop={10}>
              <Text style={[styles.pillText, styles.deleteText]}>Ta bort</Text>
            </Pressable>
            <Pressable style={styles.pill} onPress={onClose} hitSlop={10}>
              <Text style={styles.pillText}>Stäng</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  top: { position: 'absolute', top: 60, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counter: { color: '#fff', fontSize: 15, fontWeight: '700', textShadowColor: '#000', textShadowRadius: 4 },
  actions: { flexDirection: 'row', gap: 10 },
  pill: { backgroundColor: 'rgba(0, 0, 0, 0.55)', borderRadius: 99, paddingVertical: 8, paddingHorizontal: 16 },
  pillText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  deleteText: { color: '#ff8a7a' },
  caption: { position: 'absolute', left: 20, right: 20, bottom: 50, flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
    overflow: 'hidden',
  },
  date: { color: '#fff', fontSize: 15, fontWeight: '600', textShadowColor: '#000', textShadowRadius: 4 },
})

export default PhotoViewer
