import { useRef } from 'react'
import { Animated, Easing } from 'react-native'
import { DISARM_HOLD_MS } from './useMotionGuard.js'

// Håll inne för att bekräfta: en mätare som fylls under DISARM_HOLD_MS och kör
// onDone när den är full. Släpper man för tidigt sjunker den snabbt tillbaka.
export function useHoldToConfirm(onDone) {
  const fill = useRef(new Animated.Value(0)).current
  const animation = useRef(null)

  function startHold() {
    animation.current = Animated.timing(fill, {
      toValue: 1,
      duration: DISARM_HOLD_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    })
    animation.current.start(({ finished }) => {
      if (!finished) return
      fill.setValue(0)
      onDone()
    })
  }

  function stopHold() {
    animation.current?.stop()
    Animated.timing(fill, { toValue: 0, duration: 250, useNativeDriver: false }).start()
  }

  return { fill, startHold, stopHold }
}
