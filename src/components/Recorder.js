import { Pressable, StyleSheet } from 'react-native'
import { MicIcon, StopIcon } from './icons.js'
import { colors } from '../theme.js'

// Bara knappen - själva inspelningen sköts av useRecorder. Den är störst
// och fylld, eftersom det roligaste är att tjata med sin egen röst: orange
// att börja med, mörkröd med stopp medan man pratar och grön när det finns
// en inspelning.
function Recorder({ isRecording, hasRecording, onStart, onStop }) {
  return (
    <Pressable
      style={[styles.btn, hasRecording && styles.hasRecording, isRecording && styles.recording]}
      onPress={isRecording ? onStop : onStart}
      accessibilityLabel={isRecording ? 'Sluta spela in' : 'Spela in ditt tjat'}
    >
      {isRecording ? <StopIcon color="#fff" size={30} /> : <MicIcon color="#fff" size={30} />}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recording: { backgroundColor: colors.accentDark },
  hasRecording: { backgroundColor: colors.ok },
})

export default Recorder
