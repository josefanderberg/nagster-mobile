import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { CATEGORY } from './notifications.js'

// Lämnar man appen medan vakten är på - hemskärmen, en annan app eller
// sidoknappen - pausar iOS appen, och då kan den varken känna rörelser eller
// vibrera. I stället öser appen på med notiser som vibrerar och tjatar:
// varannan sekund den första halvminuten, sedan var tionde sekund i fem
// minuter. De tas bort så fort man är tillbaka i appen. Tillsammans med
// tjatens egna larm håller det sig under iOS gräns på 64 bokade notiser.
const FAST = { every: 2, count: 15 }
const SLOW = { every: 10, count: 30 }

function ids() {
  return Array.from({ length: 1 + FAST.count + SLOW.count }, (_, index) => `vakt-${index}`)
}

// soundFile är tjatets röst i Library/Sounds, eller null för systemljudet
export async function startAwayAlarm(soundFile) {
  const content = {
    title: 'Vakten är på!',
    body: 'Lägg ner mobilen och gå tillbaka till Tjat.',
    sound: soundFile ?? true,
    interruptionLevel: 'timeSensitive',
    data: { guard: true },
  }
  const offsets = [
    0,
    ...Array.from({ length: FAST.count }, (_, index) => (index + 1) * FAST.every),
    ...Array.from({ length: SLOW.count }, (_, index) => FAST.count * FAST.every + (index + 1) * SLOW.every),
  ]
  const now = Date.now()
  await Promise.all(
    offsets.map((seconds, index) =>
      Notifications.scheduleNotificationAsync({
        identifier: ids()[index],
        content,
        trigger:
          seconds === 0
            ? null // den första kommer direkt
            : {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: new Date(now + seconds * 1000),
                ...(Platform.OS === 'android' && { channelId: CATEGORY }),
              },
      }).catch(() => {})
    )
  )
}

export async function stopAwayAlarm() {
  await Promise.all(
    ids().flatMap((id) => [
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {}),
      Notifications.dismissNotificationAsync(id).catch(() => {}),
    ])
  )
}
