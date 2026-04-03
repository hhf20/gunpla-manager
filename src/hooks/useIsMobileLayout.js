import { useEffect, useState } from 'react'

const MOBILE_BREAKPOINT = 960

function readIsMobile() {
  if (typeof window === 'undefined') return false
  return window.innerWidth < MOBILE_BREAKPOINT
}

export function useIsMobileLayout() {
  const [isMobile, setIsMobile] = useState(readIsMobile)

  useEffect(() => {
    const onResize = () => setIsMobile(readIsMobile())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return isMobile
}
