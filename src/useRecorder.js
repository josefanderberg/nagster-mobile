import { useState } from 'react'
import { Platform } from 'react-native'
import { IOSOutputFormat, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio'
import { allowHapticsWhileRecording, prepareListening } from '../modules/tjat-native/index.js'

// iOS spelar bara upp notisljud i okomprimerade format, därför wav där.
// Android kan inte spela in wav och behåller m4a. Mono räcker gott för röst
// och halverar filstorleken.
const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  extension: Platform.OS === 'ios' ? '.wav' : '.m4a',
  numberOfChannels: 1,
  ios: {
    ...RecordingPresets.HIGH_QUALITY.ios,
    extension: '.wav',
    outputFormat: IOSOutputFormat.LINEARPCM,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
}

// Sköter mikrofonen. Samma gränssnitt som webbens useRecorder, men med
// expo-audio i stället för webbläsarens MediaRecorder.
export function useRecorder(onError) {
  const [isRecording, setIsRecording] = useState(false)
  const [audio, setAudio] = useState(null)
  const recorder = useAudioRecorder(RECORDING_OPTIONS)

  async function start() {
    try {
      const { granted } = await requestRecordingPermissionsAsync()
      if (!granted) return onError('Tjat behöver mikrofonen för att kunna tjata med din röst.')

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
      allowHapticsWhileRecording() // annars känns inte ringen medan man pratar in
      await recorder.prepareToRecordAsync()
      recorder.record()
      setIsRecording(true)
      prepareListening() // så att inspelningen kan bli en titel direkt
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
    // Kvar i inspelningsläge går senare uppspelning genom den tysta
    // öronsnäckan på iOS - växla tillbaka direkt.
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
    setIsRecording(false)
    setAudio(recorder.uri)
    return recorder.uri
  }

  function reset() {
    setAudio(null)
  }

  return { isRecording, audio, start, stop, reset }
}
