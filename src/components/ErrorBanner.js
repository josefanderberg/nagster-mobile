import { Pressable, StyleSheet, Text, View } from 'react-native'

function ErrorBanner({ message, onRetry }) {
  if (!message) return null

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{message}</Text>
      <Pressable onPress={onRetry}>
        <Text style={styles.retry}>Försök igen</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#fdeceb',
    borderColor: '#f5b7b1',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  text: { color: '#922b21' },
  retry: { color: '#922b21', fontWeight: '600' },
})

export default ErrorBanner
