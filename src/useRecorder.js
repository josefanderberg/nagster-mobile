import { useState } from 'react'
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio'

// Sköter mikrofonen. Samma gränssnitt som webbens useRecorder, men med
// expo-audio i stället för webbläsarens MediaRecorder.
export function useRecorder(onError) {
  const [isRecording, setIsRecording] = useState(false)
  const [audio, setAudio] = useState(null)
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)

  async function start() {
    try {
      const { granted } = await requestRecordingPermissionsAsync()
      if (!granted) return onError('Tjat behöver mikrofonen för att kunna tjata med din röst.')

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
      await recorder.prepareToRecordAsync()
      recorder.record()
      setIsRecording(true)
    } catch {
      onError('Kunde inte starta mikrofonen.')
    }
  }

  // Stoppar och ger tillbaka inspelningen. Pågår ingen inspelning lämnas den
  // som redan finns tillbaka, så att den som trycker Starta mitt i en
  // inspelning ändå får med sitt tjat.
  async function stop() {
    if (!isRecording) return audio

    await recorder.stop()
    setIsRecording(false)
    setAudio(recorder.uri)
    return recorder.uri
  }

  function reset() {
    setAudio(null)
  }

  return { isRecording, audio, start, stop, reset }
}
