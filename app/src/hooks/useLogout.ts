import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'wouter'

interface UseLogout {
  logout: () => void
  isLoading: boolean
}

export function useLogout(): UseLogout {
  const timeoutId = useRef<ReturnType<typeof setTimeout>>(null)
  const [isLoading, setLoading] = useState<boolean>(false)
  const [_, navigate] = useLocation()

  const logout = useCallback(() => {
    setLoading(true)
    timeoutId.current = setTimeout(() => navigate('/login'), 1000);
  }, [])

  useEffect(() => {
    return () => {
      const id = timeoutId.current
      if (id !== null) {
        clearTimeout(id)
      }
    }
  }, [])

  return { logout, isLoading }
}
