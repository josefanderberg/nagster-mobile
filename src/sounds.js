import { Platform } from 'react-native'
import { Directory, File, Paths } from 'expo-file-system'

// iOS spelar bara upp egna notisljud som ligger i appens Library/Sounds.
// Katalogen finns inte i Paths-API:et, men den ligger bredvid Documents.
function soundsDir() {
  return new Directory(Paths.document.uri.replace(/\/Documents\/?$/, '/Library/Sounds'))
}

// Filnamnet notisen refererar till - iOS vill ha bara namnet, ingen sökväg
export function soundName(taskId) {
  return `tjat-${taskId}.wav`
}

// Kopierar inspelningen till Library/Sounds så notisen kan tjata med din
// röst även när appen är död. Returnerar filnamnet, eller null på Android
// (där notisen får systemljudet i stället).
export function saveLocalSound(taskId, recordingUri) {
  if (Platform.OS !== 'ios') return null
  try {
    const dir = soundsDir()
    dir.create({ intermediates: true, idempotent: true })
    const target = new File(dir, soundName(taskId))
    if (target.exists) target.delete()
    new File(recordingUri).copy(target)
    return soundName(taskId)
  } catch {
    return null // utan lokal kopia faller notisen tillbaka på systemljudet
  }
}

// Lokala kopians uri för uppspelning i appen (tjatmotorn och vakten).
// Null om kopian saknas, till exempel för tjat skapade i webbappen.
export function localSoundUri(taskId) {
  if (Platform.OS !== 'ios') return null
  try {
    const file = new File(soundsDir(), soundName(taskId))
    return file.exists ? file.uri : null
  } catch {
    return null
  }
}

export function deleteLocalSound(taskId) {
  if (Platform.OS !== 'ios') return
  try {
    const file = new File(soundsDir(), soundName(taskId))
    if (file.exists) file.delete()
  } catch {
    // redan borta eller oläsbar - inget att göra
  }
}
