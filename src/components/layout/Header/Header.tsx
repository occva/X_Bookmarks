import { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import styles from './Header.module.css'

interface HeaderProps {
  onFileSelect: (file: File | File[]) => void
  loading?: boolean
}

export interface HeaderRef {
  openLoadPanel: () => void
}

export const Header = forwardRef<HeaderRef, HeaderProps>(({ onFileSelect, loading }, ref) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonContainerRef = useRef<HTMLDivElement>(null)
  const [showPanel, setShowPanel] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        showPanel &&
        panelRef.current &&
        !panelRef.current.contains(target) &&
        buttonContainerRef.current &&
        !buttonContainerRef.current.contains(target)
      ) {
        setShowPanel(false)
      }
    }

    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPanel])

  const handleLoadButtonClick = () => {
    setShowPanel(!showPanel)
  }

  useImperativeHandle(ref, () => ({
    openLoadPanel: () => {
      setShowPanel(true)
    },
  }))

  const handleFileButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const jsonFiles = Array.from(files).filter(
        (file) =>
          file.type === 'application/json' ||
          file.name.toLowerCase().endsWith('.json')
      )
      if (jsonFiles.length > 0) {
        onFileSelect(jsonFiles.length === 1 ? jsonFiles[0] : jsonFiles)
        setShowPanel(false)
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

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const jsonFiles = Array.from(files).filter(
        (file) =>
          file.type === 'application/json' ||
          file.name.toLowerCase().endsWith('.json')
      )
      if (jsonFiles.length > 0) {
        onFileSelect(jsonFiles.length === 1 ? jsonFiles[0] : jsonFiles)
        setShowPanel(false)
      }
    }
  }

  return (
    <div className={styles.header}>
      <h1>书签</h1>
      <div className={styles.fileUploadArea}>
        <div ref={buttonContainerRef} className={styles.loadButtonContainer}>
          <button
            className={styles.loadBookmarkBtn}
            onClick={handleLoadButtonClick}
            type="button"
            disabled={loading}
          >
            加载收藏
          </button>
        </div>
        {showPanel && (
          <>
            <div className={styles.loadPanelOverlay} onClick={handleLoadButtonClick} />
            <div ref={panelRef} className={styles.loadPanel}>
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
          </>
        )}
      </div>
    </div>
  )
})

