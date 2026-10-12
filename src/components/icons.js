import Svg, { Circle, Path, Rect } from 'react-native-svg'

// Samma ikoner som webbappen, ritade med react-native-svg i stället för emojis
function Icon({ color, children }) {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </Svg>
  )
}

export function ClockIcon({ color }) {
  return (
    <Icon color={color}>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7v5l3 2" />
    </Icon>
  )
}

export function TimerIcon({ color }) {
  return (
    <Icon color={color}>
      <Path d="M10 2h4" />
      <Path d="M12 9v5" />
      <Circle cx="12" cy="14" r="8" />
    </Icon>
  )
}

export function PencilIcon({ color }) {
  return (
    <Icon color={color}>
      <Path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
      <Path d="m14.5 6.5 3 3" />
    </Icon>
  )
}

export function MicIcon({ color }) {
  return (
    <Icon color={color}>
      <Rect x="9" y="3" width="6" height="11" rx="3" />
      <Path d="M5 11a7 7 0 0 0 14 0" />
      <Path d="M12 18v3" />
    </Icon>
  )
}

export function StopIcon({ color }) {
  return (
    <Icon color={color}>
      <Rect x="7" y="7" width="10" height="10" rx="2" fill={color} />
    </Icon>
  )
}

export function LockIcon({ color }) {
  return (
    <Icon color={color}>
      <Rect x="5" y="11" width="14" height="10" rx="2" />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Icon>
  )
}

export function FlameIcon({ color }) {
  return (
    <Icon color={color}>
      <Path
        d="M12 2.5c.5 3.2 4.5 5 4.5 10a4.5 4.5 0 0 1-9 0c0-2 1-3.5 2.3-4.6.1 1.6.8 2.6 1.9 3C11.2 8.5 11 5.5 12 2.5Z"
        fill={color}
      />
    </Icon>
  )
}

// Kameran för ertappad-bilderna. Avstängd får den ett snedstreck.
export function CameraIcon({ color, off = false }) {
  return (
    <Icon color={color}>
      <Path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
      <Circle cx="12" cy="13" r="3.5" />
      {off && <Path d="M3 3l18 18" />}
    </Icon>
  )
}

// Liten fylld spela-triangel till Kör-knappen i listan
export function PlayIcon({ color }) {
  return (
    <Svg width={10} height={12} viewBox="0 0 10 12">
      <Path d="M1 1.2v9.6a.8.8 0 0 0 1.2.7l7.4-4.8a.8.8 0 0 0 0-1.4L2.2.5A.8.8 0 0 0 1 1.2Z" fill={color} />
    </Svg>
  )
}
