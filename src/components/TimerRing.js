import { useRef } from 'react'
import { View } from 'react-native'
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg'
import { arcSegments, CENTER, polar, RADIUS, SIZE } from '../timerRing.js'
import { mixWithWhite } from '../theme.js'

// Samma ring som i webbappen, ritad med react-native-svg. Två lägen: reglage
// när tiden ställs in, och nedräkning när tjatet är igång.
function TimerRing({ units, label, color, onPointer, interactive = true, mirrored = false }) {
  const ringRef = useRef(null)
  const layout = useRef({ x: 0, y: 0 })

  // Fingret ger koordinater i sidan, så vi behöver veta var ringen sitter
  function handleLayout() {
    ringRef.current?.measureInWindow((x, y, width, height) => {
      layout.current = { left: x, top: y, width, height }
    })
  }

  function handleTouch(event) {
    if (!interactive) return
    const { pageX, pageY } = event.nativeEvent
    onPointer(pageX, pageY, layout.current)
  }

  const [handleX, handleY] = polar(units, mirrored)
  const small = label.length > 3

  return (
    <View
      ref={ringRef}
      onLayout={handleLayout}
      onStartShouldSetResponder={() => interactive}
      onMoveShouldSetResponder={() => interactive}
      onResponderGrant={handleTouch}
      onResponderMove={handleTouch}
    >
      <Svg width={SIZE} height={SIZE}>
        <Circle cx={CENTER} cy={CENTER} r={RADIUS} stroke="#e8e0d5" strokeWidth={14} fill="none" />

        {arcSegments(units, mirrored).map((segment, index) => (
          <Path
            key={index}
            d={segment.d}
            stroke={mixWithWhite(color, segment.strength)}
            strokeWidth={14}
            fill="none"
          />
        ))}

        {interactive && (
          <Circle cx={handleX} cy={handleY} r={13} fill="#fff" stroke={color} strokeWidth={4} />
        )}

        <SvgText
          x={CENTER}
          y={CENTER}
          fontSize={small ? 36 : 44}
          fontWeight="700"
          fill="#2b2118"
          textAnchor="middle"
          alignmentBaseline="central"
        >
          {label}
        </SvgText>
      </Svg>
    </View>
  )
}

export default TimerRing
