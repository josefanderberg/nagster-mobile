import { useRef, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'

const HOLD_MILLISECONDS = 3000

// Den röda skärmen när telefonen plockats upp. Larmet går bara att stänga av
// genom att hålla inne knappen – så att man inte gör det på ren autopilot.
function GuardAlarm({ visible, onDisarm }) {
  const [holding, setHolding] = useState(false)
  const holdTimer = useRef(null)

  function startHold() {
    setHolding(true)
    holdTimer.current = setTimeout(() => {
      setHolding(false)
      onDisarm()
    }, HOLD_MILLISECONDS)
  }

  function stopHold() {
    clearTimeout(holdTimer.current)
    setHolding(false)
  }

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.screen}>
        <Text style={styles.heading}>LÄGG NED{'\n'}MOBILEN</Text>
        <Text style={styles.sub}>Lägg tillbaka den så tystnar larmet.</Text>

        <Pressable style={[styles.hold, holding && styles.holding]} onPressIn={startHold} onPressOut={stopHold}>
          <Text style={styles.holdText}>
            {holding ? 'Håll kvar …' : 'Håll inne i 3 sekunder för att stänga av vakten'}
          </Text>
        </Pressable>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#c1121f',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  heading: { color: '#fff', fontSize: 46, fontWeight: '900', textAlign: 'center', lineHeight: 52 },
  sub: { color: '#ffd7d9', fontSize: 16, textAlign: 'center' },
  hold: {
    marginTop: 32,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  holding: { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  holdText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
})

export default GuardAlarm
