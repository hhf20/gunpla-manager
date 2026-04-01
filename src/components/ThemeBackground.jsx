import { useGunpla } from '../context/GunplaContext'

/**
 * 全屏背景：使用 img + file:// 与封面图一致，在 Electron 下比 CSS background-image 更稳定。
 */
function ThemeBackground() {
  const { theme } = useGunpla()
  const opacity =
    typeof theme.backgroundOpacity === 'number' && Number.isFinite(theme.backgroundOpacity)
      ? Math.min(1, Math.max(0, theme.backgroundOpacity))
      : 0.35

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0 bg-zinc-950" aria-hidden />
      {theme.backgroundImage ? (
        <img
          src={theme.backgroundImage}
          alt=""
          className="pointer-events-none fixed inset-0 z-[1] h-full w-full object-cover"
          style={{ opacity }}
          draggable={false}
        />
      ) : null}
    </>
  )
}

export default ThemeBackground
