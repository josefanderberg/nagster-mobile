import { Directory, File, Paths } from 'expo-file-system'

// Allt sparas i telefonen, så att appen fungerar utan nät - i skogen också.
// Funktionerna heter som när datan låg i API:et och är fortfarande async,
// så skärmarna behövde inte ändras.
const tasksFile = new File(Paths.document, 'tjat.json')
const recordingsDir = new Directory(Paths.document, 'inspelningar')

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
  if (!task.filePath) return task
  return { ...task, filePath: new File(recordingsDir, task.filePath).uri }
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
    createdAt: new Date().toISOString(),
  }
  writeAll([task, ...readAll()])
  return task
}

// Bara fälten som går att ändra - resten behåller sitt gamla värde
export async function updateTask(id, { title, status, snoozeCount, durationSeconds }) {
  const tasks = readAll()
  const index = tasks.findIndex((task) => task.id === id)
  if (index === -1) throw new Error('Tjatet finns inte längre')

  const updated = { ...tasks[index], title, status, snoozeCount, durationSeconds }
  tasks[index] = updated
  writeAll(tasks)
  return withUri(updated)
}

// Ett gammalt tjat som körs igen: nollställt och överst i listan
export async function restartTask(id, durationSeconds) {
  const tasks = readAll()
  const task = tasks.find((item) => item.id === id)
  if (!task) throw new Error('Tjatet finns inte längre')

  const restarted = { ...task, status: 'pending', snoozeCount: 0, durationSeconds }
  writeAll([restarted, ...tasks.filter((item) => item.id !== id)])
  return withUri(restarted)
}

export async function deleteTask(id) {
  const tasks = readAll()
  const task = tasks.find((item) => item.id === id)
  writeAll(tasks.filter((item) => item.id !== id))
  if (task?.filePath) {
    try {
      new File(recordingsDir, task.filePath).delete()
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
