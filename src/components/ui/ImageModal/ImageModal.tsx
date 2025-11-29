import { memo } from 'react'
import styles from './ImageModal.module.css'

interface ImageModalProps {
  isOpen: boolean
  imageUrl: string
  currentIndex: number
  totalImages: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

export const ImageModal = memo(function ImageModal({
  isOpen,
  imageUrl,
  currentIndex,
  totalImages,
  onClose,
  onPrev,
  onNext,
}: ImageModalProps) {
  if (!isOpen) return null

  return (
    <div className={styles.imageModal} onClick={onClose}>
      <div className={styles.imageModalContent} onClick={(e) => e.stopPropagation()}>
        <button
          className={styles.imageModalClose}
          onClick={onClose}
          aria-label="关闭"
        >
          <svg viewBox="0 0 24 24">
            <path d="M10.59 12L4.54 5.96l1.42-1.42L12 10.59l6.04-6.05 1.42 1.42L13.41 12l6.05 6.04-1.42 1.42L12 13.41l-6.04 6.05-1.42-1.42L10.59 12z" />
          </svg>
        </button>
        {totalImages > 1 && (
          <button
            className={`${styles.imageModalNav} ${styles.prev}`}
            onClick={onPrev}
            aria-label="上一张"
          >
            <svg viewBox="0 0 24 24">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </button>
        )}
        <img src={imageUrl} alt="放大图片" />
        {totalImages > 1 && (
          <button
            className={`${styles.imageModalNav} ${styles.next}`}
            onClick={onNext}
            aria-label="下一张"
          >
            <svg viewBox="0 0 24 24">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
          </button>
        )}
        {totalImages > 1 && (
          <div className={styles.imageModalCounter}>
            {currentIndex + 1} / {totalImages}
          </div>
        )}
      </div>
    </div>
  )
})

