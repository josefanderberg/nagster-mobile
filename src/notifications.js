import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'

export const CATEGORY = 'tjat-alarm'
const REPEATS = [60, 120] // påminnelser 1 och 2 minuter efter utgång

// I förgrunden tjatar appen själv med eskalering - notisen visas men är tyst
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

// Körs en gång vid appstart (App.js)
export async function setupNotifications() {
  // Knapparna öppnar appen - att hantera dem i bakgrunden utan JS går inte
  // i managed workflow, och appen behöver ändå öppnas för PUT:en.
  await Notifications.setNotificationCategoryAsync(CATEGORY, [
    { identifier: 'done', buttonTitle: 'Klart', options: { opensAppToForeground: true } },
    { identifier: 'snooze', buttonTitle: 'Snooza', options: { opensAppToForeground: true } },
  ])

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CATEGORY, {
      name: 'Tjatlarm',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default', // egen röst per tjat går inte på Android - ljud bakas vid bygget
      vibrationPattern: [0, 500, 250, 500],
    })
  }
}

// Frågas första gången ett tjat startas, inte vid appstart
export async function ensureNotificationPermission() {
  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true
  const asked = await Notifications.requestPermissionsAsync()
  return asked.granted
}

// En larmserie: rösten vid endsAt plus tjatiga påminnelser efteråt.
// soundFile är filnamnet i Library/Sounds, eller null för systemljudet.
export async function scheduleAlarm(task, endsAt, soundFile) {
  await cancelAlarm() // aldrig två serier samtidigt - bara ett tjat åt gången

  const content = {
    title: 'Tjat!',
    body: task.title,
    categoryIdentifier: CATEGORY,
    sound: soundFile ?? true,
    interruptionLevel: 'timeSensitive', // bryter genom fokuslägen
    data: { taskId: task.id },
  }

  for (const [index, offset] of [0, ...REPEATS].entries()) {
    const date = new Date(endsAt + offset * 1000)
    if (date <= new Date()) continue // passerade tider går inte att boka
    await Notifications.scheduleNotificationAsync({
      content: index === 0 ? content : { ...content, title: 'Tjat! Fortfarande inte klar?' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        ...(Platform.OS === 'android' && { channelId: CATEGORY }),
      },
    })
  }
}

// Appen har bara en larmserie, så allt kan avbokas i klump
export function cancelAlarm() {
  return Notifications.cancelAllScheduledNotificationsAsync()
}
