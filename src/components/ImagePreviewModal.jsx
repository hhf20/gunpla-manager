import { useEffect } from 'react'

function ImagePreviewModal({ isOpen, images, currentIndex, onClose, onPrev, onNext }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isOpen) return
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') onPrev()
      if (event.key === 'ArrowRight') onNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, onPrev, onNext])

  const image = images[currentIndex] || ''

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 transition ${
        isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
      onClick={onClose}
    >
      <button
        onClick={(event) => {
          event.stopPropagation()
          onPrev()
        }}
        className="absolute left-6 rounded-full bg-zinc-800/80 px-3 py-2 text-white transition hover:brightness-110"
      >
        ←
      </button>
      <img
        src={image}
        alt="preview"
        className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
      />
      <button
        onClick={(event) => {
          event.stopPropagation()
          onNext()
        }}
        className="absolute right-6 rounded-full bg-zinc-800/80 px-3 py-2 text-white transition hover:brightness-110"
      >
        →
      </button>
    </div>
  )
}

export default ImagePreviewModal
