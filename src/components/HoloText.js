import { useEffect, useState } from 'react'
import { View } from 'react-native'
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg'

// Holografiska färger. Varje tjat får en egen variant, så att de ser lite
// unika ut. Första och sista färgen är samma, så att vågen loopar sömlöst.
const VARIANTS = [
  { name: 'opal', colors: ['#ff9ad5', '#9ae8ff', '#c9a8ff', '#a8ffd8', '#fff3a8', '#ff9ad5'], tilt: 0.5, period: 3200, glint: 1900 },
  { name: 'regnbåge', colors: ['#ff7a7a', '#ffd36e', '#7dffb0', '#6ec8ff', '#c08bff', '#ff7a7a'], tilt: 0.2, period: 2600, glint: 2300 },
  { name: 'is', colors: ['#7fe7ff', '#f0fbff', '#a99bff', '#c8f4ff', '#7fe7ff'], tilt: 0.8, period: 4000, glint: 1600 },
  { name: 'guld', colors: ['#ffcf6b', '#fff4cc', '#f2a54a', '#ffe7a0', '#ffcf6b'], tilt: 0.4, period: 3600, glint: 1500 },
  { name: 'lagun', colors: ['#5ef2d6', '#5aa9ff', '#d77cff', '#9dfff0', '#5ef2d6'], tilt: 0.6, period: 2900, glint: 2100 },
]

const FRAME_MS = 33 // runt 30 bilder i sekunden räcker för ett glimmer

export function holoVariant(seed) {
  return VARIANTS[Math.abs(seed) % VARIANTS.length]
}

// Färgerna två varv över gradientens bredd, så att den kan glida ett helt varv
function stops(colors) {
  const steps = colors.length - 1
  return Array.from({ length: steps * 2 + 1 }, (_, index) => ({
    offset: index / (steps * 2),
    color: colors[index % steps],
  }))
}

// Text som glimmar holografiskt: en färgvåg som glider genom bokstäverna
// och ett ljust glitter som sveper förbi i ett annat tempo.
function HoloText({ text, seed, fontSize = 18 }) {
  const variant = holoVariant(seed)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let frame
    let last = 0
    const tick = (time) => {
      if (time - last >= FRAME_MS) {
        last = time
        setNow(Date.now())
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  // Båda går från 0 till 1 och börjar om. Gradienten täcker alltid hela
  // texten, eftersom den sträcker sig ett varv åt varje håll.
  const wave = (now % variant.period) / variant.period
  const glint = (now % variant.glint) / variant.glint

  const width = Math.ceil(text.length * fontSize * 0.58) + 6
  const height = Math.ceil(fontSize * 1.35)
  const id = `holo-${seed}`

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={`${id}-wave`} x1={wave - 1} y1={0} x2={wave + 1} y2={variant.tilt}>
            {stops(variant.colors).map((stop, index) => (
              <Stop key={index} offset={stop.offset} stopColor={stop.color} />
            ))}
          </LinearGradient>
          <LinearGradient id={`${id}-glint`} x1={glint * 3 - 1.5} y1={0} x2={glint * 3 - 0.5} y2={0.3}>
            <Stop offset={0.35} stopColor="#ffffff" stopOpacity={0} />
            <Stop offset={0.5} stopColor="#ffffff" stopOpacity={0.85} />
            <Stop offset={0.65} stopColor="#ffffff" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {[`${id}-wave`, `${id}-glint`].map((fill) => (
          <SvgText
            key={fill}
            x={width / 2}
            y={fontSize}
            fontSize={fontSize}
            fontWeight="800"
            textAnchor="middle"
            fill={`url(#${fill})`}
          >
            {text}
          </SvgText>
        ))}
      </Svg>
    </View>
  )
}

export default HoloText
