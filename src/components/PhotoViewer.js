import { useState } from 'react'
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { colors } from '../theme.js'

const LABELS = {
  snooze: { text: 'SNOOZE', color: '#c1121f' },
  done: { text: 'KLARAT', color: colors.ok },
  late: { text: 'TILL SLUT', color: '#f08c00' },
}

// Bevisen i helskärm: svep åt sidan för att bläddra mellan bilderna.
// startIndex är bilden man tryckte på, eller null när visaren är stängd.
function PhotoViewer({ photos, startIndex, onClose }) {
  const { width, height } = useWindowDimensions()
  const [index, setIndex] = useState(0)
  const open = startIndex !== null

  return (
    <Modal visible={open} animationType="fade" onRequestClose={onClose} onShow={() => setIndex(startIndex ?? 0)}>
      <View style={styles.screen}>
        {open && (
          <FlatList
            data={photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={startIndex}
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
            {index + 1} / {photos.length}
          </Text>
          <Pressable style={styles.close} onPress={onClose} hitSlop={10}>
            <Text style={styles.closeText}>Stäng</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  top: { position: 'absolute', top: 60, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counter: { color: '#fff', fontSize: 15, fontWeight: '700', textShadowColor: '#000', textShadowRadius: 4 },
  close: { backgroundColor: 'rgba(0, 0, 0, 0.55)', borderRadius: 99, paddingVertical: 8, paddingHorizontal: 16 },
  closeText: { color: '#fff', fontSize: 15, fontWeight: '700' },
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
