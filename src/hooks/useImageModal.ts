import { useState, useEffect, useCallback } from 'react'
import type { ImageInfo } from '../types'

export function useImageModal(images: ImageInfo[]) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const openModal = useCallback((index: number) => {
    if (index >= 0 && index < images.length) {
      setCurrentIndex(index)
      setIsOpen(true)
      document.body.style.overflow = 'hidden'
    }
  }, [images.length])

  const closeModal = useCallback(() => {
    setIsOpen(false)
    document.body.style.overflow = ''
  }, [])

  const nextImage = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }, [images.length])

  const prevImage = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }, [images.length])

  // 键盘导航
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal()
      } else if (e.key === 'ArrowLeft') {
        prevImage()
      } else if (e.key === 'ArrowRight') {
        nextImage()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, closeModal, prevImage, nextImage])

  return {
    isOpen,
    currentIndex,
    currentImage: images[currentIndex],
    openModal,
    closeModal,
    nextImage,
    prevImage,
    totalImages: images.length,
  }
}

