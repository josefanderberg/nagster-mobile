import { useEffect, useRef, useState } from 'react'
import { Image, Modal, StyleSheet, Text, View } from 'react-native'
import { CameraView } from 'expo-camera'
import { savePhoto } from '../store.js'
import { colors } from '../theme.js'

const SETTLE_MS = 400 // kameran behöver en stund för ljuset innan bilden blir bra
const SHOW_MS = 2400 // så länge bilden med stämpeln visas
const GIVE_UP_MS = 5000 // blir kameran aldrig redo stängs den tyst

const STAMPS = {
  snooze: { text: 'ERTAPPAD PÅ\nBAR GÄRNING!', color: '#c1121f' },
  done: { text: 'KLARAT!', color: colors.ok },
  late: { text: 'KLARAT...\nTILL SLUT', color: '#f08c00' },
}

// Ertappad-kameran: frontkameran tar en bild när man snoozar eller klarar ett
// tjat, och visar den en stund med en stämpel. Bilden sparas på tjatet och
// syns som bevis i detaljvyn. shot är { kind, taskId } eller null.
function GotchaCamera({ shot, onSaved, onClose }) {
  const camera = useRef(null)
  const taken = useRef(false)
  const [photo, setPhoto] = useState(null)

  useEffect(() => {
    if (!shot) return
    taken.current = false
    setPhoto(null)
    const giveUp = setTimeout(() => {
      if (!taken.current) onClose()
    }, GIVE_UP_MS)
    return () => clearTimeout(giveUp)
  }, [shot])

  useEffect(() => {
    if (!photo) return
    const timeout = setTimeout(onClose, SHOW_MS)
    return () => clearTimeout(timeout)
  }, [photo])

  function handleReady() {
    if (taken.current || !shot) return
    taken.current = true
    setTimeout(async () => {
      try {
        const picture = await camera.current.takePictureAsync({ quality: 0.4 })
        setPhoto(picture.uri)
        onSaved(await savePhoto(shot.taskId, picture.uri, shot.kind))
      } catch {
        onClose() // ingen bild - då blir det inget bevis den här gången
      }
    }, SETTLE_MS)
  }

  const stamp = STAMPS[shot?.kind] ?? STAMPS.done

  return (
    <Modal visible={Boolean(shot)} animationType="fade" transparent>
      <View style={styles.screen}>
        {photo ? (
          <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} />
        ) : (
          shot && (
            <CameraView
              ref={camera}
              style={StyleSheet.absoluteFill}
              facing="front"
              mirror // bilden ska se ut som spegelbilden man just såg
              onCameraReady={handleReady}
            />
          )
        )}
        {photo && (
          <View style={styles.stampWrap} pointerEvents="none">
            <View style={[styles.stamp, { borderColor: stamp.color }]}>
              <Text style={[styles.stampText, { color: stamp.color }]}>{stamp.text}</Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  stampWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  // Samma gummistämpel som FÖRSENAD, fast större
  stamp: {
    borderWidth: 5,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    transform: [{ rotate: '-12deg' }],
  },
  stampText: { fontSize: 34, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
})

export default GotchaCamera
