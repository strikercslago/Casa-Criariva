import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(() => {
    if (typeof navigator === 'undefined') {
      return false
    }

    return !navigator.onLine
  })

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false)
    }

    function handleOffline() {
      setIsOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline) {
    return null
  }

  return (
    <div className="border-b border-warning/40 bg-warning/15 px-4 py-2 text-sm font-medium text-amber-800">
      <div className="mx-auto flex max-w-screen-2xl items-center gap-2">
        <WifiOff className="h-4 w-4" aria-hidden />
        <span>Voce esta sem conexao. Algumas acoes podem nao funcionar.</span>
      </div>
    </div>
  )
}
