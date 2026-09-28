import Constants from 'expo-constants'

// Mobilen kan inte nå "localhost" (det vore telefonen själv).
// Expo vet vilken dator som kör dev-servern - vi återanvänder den adressen
// och byter bara port till API:ets 5080.
const devHost = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost'

// I tunnelläge pekar hostUri på Expos tunnel (…exp.direct), inte på datorn som
// kör API:et. Då används adressen nedan i stället. Sätt EXPO_PUBLIC_API_HOST
// när du startar Expo om datorn har en annan adress.
const LAN_FALLBACK = process.env.EXPO_PUBLIC_API_HOST ?? 'localhost'
const host = devHost.includes('exp.direct') ? LAN_FALLBACK : devHost
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
export function uploadRecording(id, localUri) {
  const form = new FormData()
  form.append('file', { uri: localUri, name: 'tjat.m4a', type: 'audio/m4a' })
  return request(`/api/tasks/${id}/file`, { method: 'POST', body: form })
}

export function fileUrl(path) {
  return `${BASE_URL}${path}`
}
