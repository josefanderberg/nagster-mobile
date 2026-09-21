import { Pressable, StyleSheet, Text } from 'react-native'
import { colors } from '../theme.js'

// Bara knappen – själva inspelningen sköts av useRecorder
function Recorder({ isRecording, hasRecording, onStart, onStop }) {
  return (
    <Pressable
      style={[styles.btn, isRecording && styles.recording, hasRecording && styles.hasRecording]}
      onPress={isRecording ? onStop : onStart}
    >
      <Text style={[styles.icon, isRecording && styles.recordingIcon]}>
        {isRecording ? '■' : '🎙'}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recording: { backgroundColor: colors.accent, borderColor: colors.accent },
  hasRecording: { borderColor: colors.accent },
  icon: { fontSize: 18, color: colors.muted },
  recordingIcon: { color: '#fff' },
})

export default Recorder
