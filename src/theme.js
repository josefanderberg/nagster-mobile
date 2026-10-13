// Samma färger som webbappen, så att de två delarna känns som samma produkt
export const colors = {
  bg: '#faf7f2',
  card: '#ffffff',
  text: '#2b2118',
  muted: '#8a7d6f',
  accent: '#ff5a36',
  accentDark: '#d63f1f',
  seconds: '#2f6fed',
  ok: '#2e9e5b',
  border: '#e8e0d5',
}

// Mörkt läge medan ett tjat går: bakgrunden mörknar och det som inte gäller
// just nu tonas ner, så att bara timern och knapparna syns tydligt
export const SHADE = 0.75 // hur mycket av textfärgen som blandas in i bakgrunden
export const DIMMED = 0.3 // opaciteten för det som tonas ner
export const lightText = '#faf7f2'
export const lightMuted = '#cfc5b8'

// Färgen man får med skuggan (colors.text) ovanpå en annan färg
export function shaded(hex) {
  const channel = (offset) => {
    const base = parseInt(hex.slice(offset, offset + 2), 16)
    const shadow = parseInt(colors.text.slice(offset, offset + 2), 16)
    return Math.round(base * (1 - SHADE) + shadow * SHADE)
  }
  return `rgb(${channel(1)}, ${channel(3)}, ${channel(5)})`
}

// Blandar en färg mot vitt. Webben gör detta med CSS color-mix, men den
// funktionen finns inte i React Native - så vi räknar ut den själva.
export function mixWithWhite(hex, strength) {
  const amount = Math.max(0, Math.min(100, strength)) / 100
  const channel = (offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16)
    return Math.round(value * amount + 255 * (1 - amount))
  }
  return `rgb(${channel(1)}, ${channel(3)}, ${channel(5)})`
}
