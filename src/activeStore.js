import { File, Paths } from 'expo-file-system'

// Litet JSON-minne så en dödad app kan återuppta de pågående tjaten.
// Notiserna levereras av systemet ändå - det här är för timrarna i appen.
const file = new File(Paths.document, 'aktivt-tjat.json')

// Varje timer: { taskId, endsAt, deadline }. deadline är den första
// sluttiden. Snooze flyttar endsAt men aldrig deadline, så att förseningen
// räknas från när tjatet egentligen skulle vara klart.
export function saveTimers(timers) {
  try {
    if (timers.length === 0) {
      if (file.exists) file.delete()
      return
    }
    file.write(
      JSON.stringify(timers.map(({ task, endsAt, deadline }) => ({ taskId: task.id, endsAt, deadline })))
    )
  } catch {
    // utan minne startar appen bara utan aktiva tjat - inget farligt
  }
}

// Äldre versioner sparade ett enda tjat, och ännu äldre saknade deadline
export function loadTimers() {
  try {
    if (!file.exists) return []
    const saved = JSON.parse(file.textSync())
    return (Array.isArray(saved) ? saved : [saved]).map((timer) => ({
      ...timer,
      deadline: timer.deadline ?? timer.endsAt,
    }))
  } catch {
    return []
  }
}
