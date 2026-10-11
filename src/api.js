import Constants from 'expo-constants'

// Mobilen kan inte nå "localhost" (det vore telefonen själv).
// I dev vet Expo vilken dator som kör Metro - vi återanvänder den adressen
// och byter bara port till API:ets 5080.
const devHost = Constants.expoConfig?.hostUri?.split(':')[0]

// I ett fristående bygge finns ingen hostUri alls, och i tunnelläge pekar den
// på Expos tunnel (…exp.direct), inte på datorn som kör API:et. Båda fallen
// använder adressen som bakades in vid bygget (EXPO_PUBLIC_API_HOST i eas.json).
const envHost = process.env.EXPO_PUBLIC_API_HOST
const host = !devHost || devHost.includes('exp.direct') ? (envHost ?? 'localhost') : devHost
const BASE_URL = `http://${host}:5080`

async function request(path, options) {
  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, options)
  } catch {
    throw new Error(`Kunde inte nå servern (${BASE_URL}) - är API:et igång?`)
  }
  if (!response.ok) {
    throw new Error(`Servern svarade med fel (${response.status})`)
  }
  // 204 No Content har ingen kropp att tolka, till exempel efter DELETE
  if (response.status === 204) return null
  return response.json()
}

export function getTasks() {
  return request('/api/tasks')
}

export function createTask(task) {
  return request('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  })
}

export function updateTask(id, task) {
  return request(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  })
}

export function deleteTask(id) {
  return request(`/api/tasks/${id}`, { method: 'DELETE' })
}

// I React Native bifogas filer som { uri, name, type } i FormData.
// iOS spelar in wav (för notisljudet), Android m4a.
export function uploadRecording(id, localUri) {
  const wav = localUri.endsWith('.wav')
  const form = new FormData()
  form.append('file', {
    uri: localUri,
    name: wav ? 'tjat.wav' : 'tjat.m4a',
    type: wav ? 'audio/wav' : 'audio/m4a',
  })
  return request(`/api/tasks/${id}/file`, { method: 'POST', body: form })
}

export function fileUrl(path) {
  return `${BASE_URL}${path}`
}
