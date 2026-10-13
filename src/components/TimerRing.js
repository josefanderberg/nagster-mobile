import { View } from 'react-native'
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg'
import { arcSegments, CENTER, polar, RADIUS, SIZE } from '../timerRing.js'
import { mixWithWhite } from '../theme.js'

// Fingrets läge mäts relativt ringen själv, så ringens ruta är hela världen
const RING_BOX = { left: 0, top: 0, width: SIZE, height: SIZE }

// Samma ring som i webbappen, ritad med react-native-svg. Två lägen: reglage
// när tiden ställs in, och nedräkning när tjatet är igång.
function TimerRing({ units, label, color, onPointer, onRelease, interactive = true, mirrored = false, labelColor = '#2b2118' }) {
  // locationX/Y är fingrets läge inuti ringen. Det är stabilare än att mäta var
  // ringen sitter på skärmen - den positionen hinner ändras när sidan laddar.
  function handleTouch(event) {
    if (!interactive) return
    const { locationX, locationY } = event.nativeEvent
    onPointer(locationX, locationY, RING_BOX)
  }

  const [handleX, handleY] = polar(units, mirrored)
  const small = label.length > 3

  return (
    <View
      // box-only: det är den här rutan som tar emot fingret, inte bågarna inuti.
      // Annars skulle locationX räknas från den båge man råkar röra.
      pointerEvents="box-only"
      onStartShouldSetResponder={() => interactive}
      onMoveShouldSetResponder={() => interactive}
      onResponderGrant={handleTouch}
      onResponderMove={handleTouch}
      onResponderRelease={onRelease}
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
          fill={labelColor}
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
