import { File, Paths } from 'expo-file-system'

// Litet JSON-minne så en dödad app kan återuppta det pågående tjatet.
// Notisen levereras av systemet ändå - det här är för timern i appen.
const file = new File(Paths.document, 'aktivt-tjat.json')

export function saveActive(taskId, endsAt) {
  try {
    file.write(JSON.stringify({ taskId, endsAt }))
  } catch {
    // utan minne startar appen bara utan aktivt tjat - inget farligt
  }
}

export function loadActive() {
  try {
    return file.exists ? JSON.parse(file.text()) : null
  } catch {
    return null
  }
}

export function clearActive() {
  try {
    if (file.exists) file.delete()
  } catch {
    // redan borta
  }
}
