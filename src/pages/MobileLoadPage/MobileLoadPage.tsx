import { useRef, useState } from 'react'
import styles from './MobileLoadPage.module.css'

interface MobileLoadPageProps {
  onBack: () => void
  onFileSelect: (file: File | File[]) => void
  loading?: boolean
}

export function MobileLoadPage({
  onBack,
  onFileSelect,
  loading,
}: MobileLoadPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileButtonClick = () => {
    if (loading) {
      return
    }
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (loading) {
      return
    }

    const files = e.target.files
    if (files && files.length > 0) {
      const jsonFiles = Array.from(files).filter(
        (file) =>
          file.type === 'application/json' ||
          file.name.toLowerCase().endsWith('.json')
      )
      if (jsonFiles.length > 0) {
        onFileSelect(jsonFiles.length === 1 ? jsonFiles[0] : jsonFiles)
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (loading) {
      return
    }

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const jsonFiles = Array.from(files).filter(
        (file) =>
          file.type === 'application/json' ||
          file.name.toLowerCase().endsWith('.json')
      )
      if (jsonFiles.length > 0) {
        onFileSelect(jsonFiles.length === 1 ? jsonFiles[0] : jsonFiles)
        setTimeout(() => {
          onBack()
        }, 500)
      }
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={onBack} type="button">
          <svg viewBox="0 0 24 24" className={styles.backIcon}>
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <h2>加载收藏</h2>
        <div className={styles.placeholder} />
      </div>
      <div className={styles.content}>
        <div
          ref={dropZoneRef}
          className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleFileButtonClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <div className={styles.dropZoneContent}>
            <div className={styles.dropZoneIcon}>📁</div>
            <div className={styles.dropZoneText}>
              <span>拖动文件到此处或点击选择文件</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
