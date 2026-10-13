import { useEffect, useRef, useState } from 'react'
import { Image, Modal, StyleSheet, Text, View } from 'react-native'
import { CameraView } from 'expo-camera'
import { savePhoto } from '../store.js'
import { colors } from '../theme.js'

const PREPARE_MS = 1000 // bilden tas en sekund efter att kameran öppnats - snabbt, men man hinner se sig själv
const SHOW_MS = 1000 // så länge bilden med stämpeln visas
const GIVE_UP_MS = 4000 // blir kameran aldrig redo stängs den tyst

const STAMPS = {
  snooze: { text: 'SNOOZE', color: '#c1121f' },
  done: { text: 'KLARAT!', color: colors.ok },
  late: { text: 'KLARAT...\nTILL SLUT', color: '#f08c00' },
}

// Ertappad-kameran: när man snoozar eller klarar ett tjat visar frontkameran
// en live-bild i en sekund, tar en bild och visar den med en stämpel i en
// sekund till. Bilden sparas på tjatet och syns som bevis i detaljvyn.
// shot är { kind, taskId } eller null.
function GotchaCamera({ shot, onSaved, onClose }) {
  const camera = useRef(null)
  const taken = useRef(false)
  const openedAt = useRef(0)
  const [photo, setPhoto] = useState(null)

  useEffect(() => {
    if (!shot) return
    taken.current = false
    openedAt.current = Date.now()
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

  // Kameran blir oftast redo innan sekunden gått - då väntar den in resten
  function handleReady() {
    if (taken.current || !shot) return
    taken.current = true
    const wait = Math.max(0, openedAt.current + PREPARE_MS - Date.now())
    setTimeout(async () => {
      try {
        const picture = await camera.current.takePictureAsync({ quality: 0.3 })
        setPhoto(picture.uri)
        onSaved(await savePhoto(shot.taskId, picture.uri, shot.kind))
      } catch {
        onClose() // ingen bild - då blir det inget bevis den här gången
      }
    }, wait)
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
