import { useEffect } from 'react'
import { useGunpla } from '../context/GunplaContext'

function ThemeBackground() {
  const { theme } = useGunpla()
  const preset = theme?.preset || 'hangar'

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    document.documentElement.dataset.appTheme = 'tactical'
    return () => {
      delete document.documentElement.dataset.appTheme
    }
  }, [preset])

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0 bg-[#0f1116]" aria-hidden />
      {theme?.backgroundImage ? (
        <img
          src={theme.backgroundImage}
          alt=""
          className="pointer-events-none fixed inset-0 z-[3] h-full w-full object-cover"
          style={{ opacity: 0.08 }}
          draggable={false}
        />
      ) : null}
      <div className="pointer-events-none fixed inset-0 z-[3] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_28%,transparent_72%,rgba(0,0,0,0.28))]" aria-hidden />
    </>
  )
}

export default ThemeBackground
