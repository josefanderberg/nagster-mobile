import { useRef } from 'react'
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'

const HOLD_MILLISECONDS = 3000
const RED = '#c1121f'
const WHITE = '#ffffff'

// Innehållet på larmskärmen, i valfri färg. Ritas två gånger – se nedan.
function AlarmContent({ color }) {
  return (
    <View style={styles.content}>
      <Text style={[styles.heading, { color }]}>LÄGG NED{'\n'}MOBILEN</Text>
      <Text style={[styles.sub, { color }]}>Lägg tillbaka den så tystnar larmet.</Text>
      <View style={[styles.hold, { borderColor: color }]}>
        <Text style={[styles.holdText, { color }]}>Håll inne i 3 sekunder för att stänga av vakten</Text>
      </View>
    </View>
  )
}

// Den röda skärmen när telefonen plockats upp. Larmet går bara att stänga av
// genom att hålla inne – så att man inte gör det på ren autopilot.
//
// Medan man håller fylls skärmen nerifrån med vitt, som en mätare, och färgerna
// byter plats. Tricket: innehållet ritas två gånger, vitt på rött underst och
// rött på vitt i fyllnaden. Fyllnaden klipper bort det som sticker upp, så det
// syns bara så långt den hunnit växa.
function GuardAlarm({ visible, onDisarm }) {
  const { width, height } = useWindowDimensions()
  const fill = useRef(new Animated.Value(0)).current
  const animation = useRef(null)

  function startHold() {
    animation.current = Animated.timing(fill, {
      toValue: 1,
      duration: HOLD_MILLISECONDS,
      easing: Easing.linear,
      useNativeDriver: false,
    })
    animation.current.start(({ finished }) => {
      if (!finished) return
      fill.setValue(0)
      onDisarm()
    })
  }

  // Släpper man för tidigt sjunker mätaren snabbt tillbaka
  function stopHold() {
    animation.current?.stop()
    Animated.timing(fill, { toValue: 0, duration: 250, useNativeDriver: false }).start()
  }

  const fillHeight = fill.interpolate({ inputRange: [0, 1], outputRange: [0, height] })

  return (
    <Modal visible={visible} animationType="none" statusBarTranslucent>
      {/* Exakt skärmens mått, i stället för att lita på att rutan fyller sig själv */}
      <Pressable style={[styles.screen, { width, height }]} onPressIn={startHold} onPressOut={stopHold}>
        <View style={[styles.layer, { height }]}>
          <AlarmContent color={WHITE} />
        </View>

        {/* Fyllnaden – släpper igenom fingret till skärmen under */}
        <Animated.View pointerEvents="none" style={[styles.fill, { height: fillHeight }]}>
          <View style={[styles.layer, { height }]}>
            <AlarmContent color={RED} />
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  screen: { backgroundColor: RED },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  heading: { fontSize: 46, fontWeight: '900', textAlign: 'center', lineHeight: 52 },
  sub: { fontSize: 16, textAlign: 'center' },
  hold: { marginTop: 32, borderWidth: 2, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 24 },
  holdText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  // Båda kopiorna ligger i varsin ruta som är lika hög som skärmen och
  // förankrad i botten – då hamnar den röda exakt ovanpå den vita
  layer: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  // Växer uppåt från botten och klipper allt som sticker utanför
  fill: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden', backgroundColor: WHITE },
})

export default GuardAlarm
