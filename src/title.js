// Gör en kort titel av det man sa in: utfyllnadsljud och inledningar som
// "kom ihåg att" bort, stor bokstav först. Ger null om inget blev kvar.

const MAX_WORDS = 7

// Ljud och småord som inte bär någon mening i en titel
const FILLERS = new Set([
  'eh', 'eeh', 'ehm', 'öh', 'öhm', 'hm', 'hmm', 'hmmm', 'mm', 'mmm', 'ah', 'aa', 'ja', 'nej', 'okej', 'ok',
  'typ', 'liksom', 'alltså', 'asså', 'ba', 'bara', 'nu', 'så',
])

// Inledningar som bara säger att det är ett tjat - det vet vi redan
const OPENINGS = [
  'kom ihåg att', 'kom ihåg', 'glöm inte att', 'glöm inte', 'du ska', 'du måste', 'jag ska', 'jag måste',
  'jag behöver', 'du behöver', 'dags att', 'nu ska du',
]

export function titleFromSpeech(text) {
  if (!text) return null

  const words = text
    .toLowerCase()
    .replace(/[.,!?;:"]/g, ' ')
    .split(/\s+/)
    .filter((word) => word && !FILLERS.has(word))

  let spoken = words.join(' ')
  for (const opening of OPENINGS) {
    if (spoken.startsWith(`${opening} `)) {
      spoken = spoken.slice(opening.length + 1)
      break
    }
  }

  const kept = spoken.split(' ').filter(Boolean).slice(0, MAX_WORDS).join(' ')
  if (!kept) return null
  return kept.charAt(0).toUpperCase() + kept.slice(1)
}
