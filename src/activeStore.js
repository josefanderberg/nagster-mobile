import { File, Paths } from 'expo-file-system'

// Litet JSON-minne så en dödad app kan återuppta det pågående tjatet.
// Notisen levereras av systemet ändå - det här är för timern i appen.
const file = new File(Paths.document, 'aktivt-tjat.json')

// deadline är den första sluttiden. Snooze flyttar endsAt men aldrig deadline,
// så att förseningen räknas från när tjatet egentligen skulle vara klart.
export function saveActive(taskId, endsAt, deadline) {
  try {
    file.write(JSON.stringify({ taskId, endsAt, deadline }))
  } catch {
    // utan minne startar appen bara utan aktivt tjat - inget farligt
  }
}

export function loadActive() {
  try {
    return file.exists ? JSON.parse(file.textSync()) : null
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
