import { useEffect, useRef, useState } from 'react'
import { Image, Modal, StyleSheet, Text, View } from 'react-native'
import { CameraView } from 'expo-camera'
import { savePhoto } from '../store.js'
import { colors } from '../theme.js'

const EXPOSURE_MS = 300 // frontkameran hinner ställa in ljuset, annars blir bilden mörk
const SHOW_MS = 1000 // så länge den frysta bilden med stämpeln visas
const GIVE_UP_MS = 4000 // blir kameran aldrig redo stängs den tyst

const STAMPS = {
  snooze: { text: 'SNOOZE', color: '#c1121f' },
  done: { text: 'KLARAT!', color: colors.ok },
  late: { text: 'KLARAT...\nTILL SLUT', color: '#f08c00' },
}

// Ertappad-kameran: när man snoozar eller klarar ett tjat tar frontkameran
// en bild så fort den är redo. Bilden fryses på skärmen i samma ögonblick,
// med stämpeln ovanpå, och visas en sekund. Bilden sparas på tjatet och syns
// som bevis i detaljvyn. shot är { kind, taskId } eller null.
function GotchaCamera({ shot, onSaved, onClose }) {
  const camera = useRef(null)
  const taken = useRef(false)
  const [frozen, setFrozen] = useState(false)
  const [photo, setPhoto] = useState(null)

  useEffect(() => {
    if (!shot) return
    taken.current = false
    setFrozen(false)
    setPhoto(null)
    const giveUp = setTimeout(() => {
      if (!taken.current) onClose()
    }, GIVE_UP_MS)
    return () => clearTimeout(giveUp)
  }, [shot])

  function handleReady() {
    if (taken.current || !shot) return
    taken.current = true
    setTimeout(capture, EXPOSURE_MS)
  }

  async function capture() {
    const frozenAt = Date.now()
    try {
      // Fotot tas och förhandsbilden fryses samtidigt - det man ser är bilden
      const picture = camera.current.takePictureAsync({ quality: 0.3 })
      camera.current.pausePreview().catch(() => {})
      setFrozen(true)
      const { uri } = await picture
      setPhoto(uri)
      onSaved(await savePhoto(shot.taskId, uri, shot.kind))
      // Stängs en sekund efter frysningen, eller direkt om sparandet tog längre
      setTimeout(onClose, Math.max(0, frozenAt + SHOW_MS - Date.now()))
    } catch {
      onClose() // ingen bild - då blir det inget bevis den här gången
    }
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
              animateShutter={false} // ingen blinkning - bilden fryses i stället
              onCameraReady={handleReady}
            />
          )
        )}
        {(frozen || photo) && (
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
  stampWrap: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
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
