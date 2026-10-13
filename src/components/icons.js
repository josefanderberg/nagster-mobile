import Svg, { Circle, Path, Rect } from 'react-native-svg'

// Samma ikoner som webbappen, ritade med react-native-svg i stället för emojis
function Icon({ color, children, size = 20 }) {
  return (
    <Svg
      width={size}
      height={size}
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

export function MicIcon({ color, size }) {
  return (
    <Icon color={color} size={size}>
      <Rect x="9" y="3" width="6" height="11" rx="3" />
      <Path d="M5 11a7 7 0 0 0 14 0" />
      <Path d="M12 18v3" />
    </Icon>
  )
}

export function StopIcon({ color, size }) {
  return (
    <Icon color={color} size={size}>
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

// Fylld stjärna för streaken - fyllningen är det som blinkar
export function StarIcon({ color }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"
        fill={color}
        stroke={color}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
    </Svg>
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

// Spola fram, som på en VHS - Kör-knappen i listan
export function FastForwardIcon({ color }) {
  return (
    <Svg width={16} height={12} viewBox="0 0 16 12">
      <Path d="M1 1.4v9.2a.7.7 0 0 0 1.1.6L7.6 6.6a.7.7 0 0 0 0-1.2L2.1.8A.7.7 0 0 0 1 1.4Z" fill={color} />
      <Path d="M8 1.4v9.2a.7.7 0 0 0 1.1.6l5.5-4.6a.7.7 0 0 0 0-1.2L9.1.8A.7.7 0 0 0 8 1.4Z" fill={color} />
    </Svg>
  )
}
