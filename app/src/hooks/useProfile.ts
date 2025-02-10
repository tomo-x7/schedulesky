import { useEffect, useState } from "react"

interface Profile {
  handle: string
  displayName: string
  avatar?: string
}

interface UseProfile {
  data: Profile | null
  isLoading: boolean
  error: unknown
}

export function useProfile(): UseProfile {
  const [data, setData] = useState<Profile | null>(null)
  const [isLoading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<unknown | null>(null)

  useEffect(() => {
    const id = setTimeout(() => {
      setData({ handle: 'unosw.jp', displayName: 'unosw' })
      setLoading(false)
      setError(null)
    }, 2000)

    return () => clearTimeout(id)
  }, [])

  return { data, isLoading, error }
}
