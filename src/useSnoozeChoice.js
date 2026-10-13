import { useEffect, useRef, useState } from 'react'
import { CHOOSE_MS, DEFAULT_SNOOZE_SECONDS } from './snooze.js'

// Valraden för mer tid: öppnas med show(), stängs när man väljer - eller
// av sig själv efter CHOOSE_MS, och då gäller standardtiden.
export function useSnoozeChoice(onPick) {
  const [open, setOpen] = useState(false)
  // Senaste handlingen via en ref, så att timern inte startas om vid varje rendering
  const pickRef = useRef(onPick)
  pickRef.current = onPick

  useEffect(() => {
    if (!open) return
    const timeout = setTimeout(() => {
      setOpen(false)
      pickRef.current(DEFAULT_SNOOZE_SECONDS)
    }, CHOOSE_MS)
    return () => clearTimeout(timeout)
  }, [open])

  return {
    open,
    show: () => setOpen(true),
    close: () => setOpen(false),
    pick: (seconds) => {
      setOpen(false)
      pickRef.current(seconds)
    },
  }
}
