import { Directory, File, Paths } from 'expo-file-system'

// Allt sparas i telefonen, så att appen fungerar utan nät - i skogen också.
// Funktionerna heter som när datan låg i API:et och är fortfarande async,
// så skärmarna behövde inte ändras.
const tasksFile = new File(Paths.document, 'tjat.json')
const recordingsDir = new Directory(Paths.document, 'inspelningar')
const photosDir = new Directory(Paths.document, 'bilder')

function readAll() {
  try {
    return tasksFile.exists ? JSON.parse(tasksFile.textSync()) : []
  } catch {
    return [] // trasig fil ska inte låsa appen
  }
}

function writeAll(tasks) {
  try {
    tasksFile.write(JSON.stringify(tasks))
  } catch {
    throw new Error('Kunde inte spara - är telefonen full?')
  }
}

// iOS byter sökväg till appens mapp vid varje uppdatering, så i filen
// sparas bara inspelningens namn. Skärmarna får den fulla adressen.
function withUri(task) {
  return {
    ...task,
    filePath: task.filePath ? new File(recordingsDir, task.filePath).uri : null,
    photos: (task.photos ?? []).map((photo) => ({ ...photo, uri: new File(photosDir, photo.name).uri })),
  }
}

// Nyast först
export async function getTasks() {
  return readAll().map(withUri)
}

export async function createTask({ title, durationSeconds }) {
  const task = {
    id: Date.now(), // unikt nog för ett tjat i taget, och blir filnamn för ljudet
    title,
    status: 'pending',
    snoozeCount: 0,
    durationSeconds,
    filePath: null,
    doneCount: 0, // hur många gånger tjatet klarats, räknas upp vid Kör igen
    lateSeconds: 0, // hur sent det klarades förra gången
    createdAt: new Date().toISOString(),
  }
  writeAll([task, ...readAll()])
  return task
}

// Bara fälten som går att ändra, och bara de som skickas med - resten
// behåller sitt gamla värde. Då kan man byta titel utan att skicka allt.
export async function updateTask(id, { title, status, snoozeCount, durationSeconds, doneCount, lateSeconds }) {
  const tasks = readAll()
  const index = tasks.findIndex((task) => task.id === id)
  if (index === -1) throw new Error('Tjatet finns inte längre')

  const changes = Object.entries({ title, status, snoozeCount, durationSeconds, doneCount, lateSeconds })
  const updated = { ...tasks[index], ...Object.fromEntries(changes.filter(([, value]) => value !== undefined)) }
  tasks[index] = updated
  writeAll(tasks)
  return withUri(updated)
}

// Ett gammalt tjat som körs igen: nollställt och överst i listan
export async function restartTask(id, durationSeconds) {
  const tasks = readAll()
  const task = tasks.find((item) => item.id === id)
  if (!task) throw new Error('Tjatet finns inte längre')

  const restarted = { ...task, status: 'pending', snoozeCount: 0, lateSeconds: 0, durationSeconds }
  writeAll([restarted, ...tasks.filter((item) => item.id !== id)])
  return withUri(restarted)
}

export async function deleteTask(id) {
  const tasks = readAll()
  const task = tasks.find((item) => item.id === id)
  writeAll(tasks.filter((item) => item.id !== id))
  const files = [
    task?.filePath && new File(recordingsDir, task.filePath),
    ...(task?.photos ?? []).map((photo) => new File(photosDir, photo.name)),
  ].filter(Boolean)
  for (const file of files) {
    try {
      file.delete()
    } catch {
      // redan borta
    }
  }
}

// Inspelningen ligger i en temporär katalog som iOS kan rensa, så den
// kopieras till Documents och kopplas till tjatet.
export async function saveRecording(id, recordingUri) {
  const name = `tjat-${id}.${recordingUri.endsWith('.wav') ? 'wav' : 'm4a'}`
  try {
    recordingsDir.create({ intermediates: true, idempotent: true })
    const target = new File(recordingsDir, name)
    if (target.exists) target.delete()
    new File(recordingUri).copySync(target)
  } catch {
    throw new Error('Kunde inte spara inspelningen')
  }

  const tasks = readAll()
  const task = tasks.find((item) => item.id === id)
  if (!task) throw new Error('Tjatet finns inte längre')
  task.filePath = name
  writeAll(tasks)
  return withUri(task)
}

// Streaken: hur många tjat i rad som klarats i tid. Den bor i en egen fil,
// eftersom tjaten bara minns sin senaste omgång.
const streakFile = new File(Paths.document, 'streak.json')

export function getStreak() {
  try {
    return streakFile.exists ? JSON.parse(streakFile.textSync()).current ?? 0 : 0
  } catch {
    return 0
  }
}

// Ett tjat som blir för sent bryter streaken direkt, innan man tryckt Klart
export function breakStreak() {
  return recordCompletion(false)
}

// Klart i tid räknar upp streaken, för sent nollställer den
export function recordCompletion(onTime) {
  const next = onTime ? getStreak() + 1 : 0
  try {
    streakFile.write(JSON.stringify({ current: next }))
  } catch {
    // utan fil börjar streaken om nästa gång - inget att stoppa Klart för
  }
  return next
}

// Inställningar, t.ex. om ertappad-kameran är på
const settingsFile = new File(Paths.document, 'installningar.json')

export function getSettings() {
  try {
    return settingsFile.exists ? JSON.parse(settingsFile.textSync()) : {}
  } catch {
    return {}
  }
}

export function saveSetting(key, value) {
  const next = { ...getSettings(), [key]: value }
  try {
    settingsFile.write(JSON.stringify(next))
  } catch {
    // inställningen gäller tills appen startas om - inget farligt
  }
  return next
}

// Ertappad-bilderna: kopieras till Documents/bilder och listas på tjatet.
// kind är 'snooze' (ertappad) eller 'done' (klarat).
export async function savePhoto(id, photoUri, kind) {
  const name = `tjat-${id}-${Date.now()}.jpg`
  try {
    photosDir.create({ intermediates: true, idempotent: true })
    new File(photoUri).copySync(new File(photosDir, name))
  } catch {
    throw new Error('Kunde inte spara bilden')
  }
  const tasks = readAll()
  const task = tasks.find((item) => item.id === id)
  if (!task) return null
  task.photos = [...(task.photos ?? []), { name, kind, at: new Date().toISOString() }]
  writeAll(tasks)
  return withUri(task)
}

// Tar bort en bevisbild, både ur tjatet och filen själv
export async function deletePhoto(id, name) {
  const tasks = readAll()
  const task = tasks.find((item) => item.id === id)
  if (!task) throw new Error('Tjatet finns inte längre')
  task.photos = (task.photos ?? []).filter((photo) => photo.name !== name)
  writeAll(tasks)
  try {
    const file = new File(photosDir, name)
    if (file.exists) file.delete()
  } catch {
    // filen är redan borta ur tjatet - en kvarglömd fil gör ingen skada
  }
  return withUri(task)
}
