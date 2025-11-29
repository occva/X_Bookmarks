import { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import { getRecentFiles, addRecentFile, removeRecentFile, type RecentFile } from '../../../utils/storage'
import styles from './Header.module.css'

interface HeaderProps {
  onFileSelect: (file: File | File[]) => void
  onURLLoad: (url: string | string[]) => void
  loading?: boolean
}

export interface HeaderRef {
  openLoadPanel: () => void
}

export const Header = forwardRef<HeaderRef, HeaderProps>(({ onFileSelect, onURLLoad, loading }, ref) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonContainerRef = useRef<HTMLDivElement>(null)
  const recentFilesRef = useRef<HTMLDivElement>(null)
  const [showPanel, setShowPanel] = useState(false)
  const [showRecentFiles, setShowRecentFiles] = useState(false)
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([])
  const [url, setUrl] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const allFiles = getRecentFiles()
    const urlFiles = allFiles.filter((f) => f.type === 'url')
    setRecentFiles(urlFiles)
  }, [])

  useEffect(() => {
    if (showPanel) {
      const allFiles = getRecentFiles()
      const urlFiles = allFiles.filter((f) => f.type === 'url')
      setRecentFiles(urlFiles)
    }
  }, [showPanel])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        showPanel &&
        panelRef.current &&
        !panelRef.current.contains(target) &&
        buttonContainerRef.current &&
        !buttonContainerRef.current.contains(target) &&
        recentFilesRef.current &&
        !recentFilesRef.current.contains(target)
      ) {
        setShowPanel(false)
        setShowRecentFiles(false)
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

  const handleURLLoad = () => {
    const urls = url.split('\n').map(u => u.trim()).filter(u => u.length > 0)
    if (urls.length > 0) {
      // 多条 URL 时保存为数组，显示名称使用第一条 URL
      const displayName = urls.length > 1 ? `${urls[0]} (${urls.length}个URL)` : urls[0]
      addRecentFile(displayName, 'url', urls[0], urls.length > 1 ? urls : undefined)
      onURLLoad(urls)
      setUrl('')
      setShowPanel(false)
      const allFiles = getRecentFiles()
      const urlFiles = allFiles.filter((f) => f.type === 'url')
      setRecentFiles(urlFiles)
    }
  }

  const handleRecentFileClick = (file: RecentFile) => {
    if (file.type === 'url') {
      // 如果有 urls 数组，加载所有 URL；否则加载单个 URL
      const urlsToLoad = file.urls && file.urls.length > 0 ? file.urls : (file.url ? [file.url] : [])
      if (urlsToLoad.length > 0) {
        onURLLoad(urlsToLoad)
        setShowPanel(false)
      }
    } else if (file.type === 'file') {
      fileInputRef.current?.click()
    }
  }

  const handleRemoveRecentFile = (e: React.MouseEvent, file: RecentFile) => {
    e.stopPropagation()
    removeRecentFile(file.name, file.type, file.url, file.urls)
    const allFiles = getRecentFiles()
    const urlFiles = allFiles.filter((f) => f.type === 'url')
    setRecentFiles(urlFiles)
  }

  const handleURLInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && url.trim()) {
      e.preventDefault()
      handleURLLoad()
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
            <div className={styles.urlSection}>
              <textarea
                className={styles.urlInput}
                placeholder="输入 JSON 文件 URL，每行一个（支持多个URL）"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleURLInputKeyDown}
                rows={3}
              />
              <button
                className={styles.loadURLBtn}
                onClick={handleURLLoad}
                type="button"
                disabled={loading || !url.trim()}
              >
                加载
              </button>
            </div>
            <div ref={recentFilesRef} className={styles.recentFilesSection}>
              <div className={styles.recentFilesHeader}>
                <span className={styles.recentFilesTitle}>最近加载的JSON文件</span>
                {recentFiles.length > 3 && (
                  <button
                    className={styles.moreBtn}
                    onClick={() => setShowRecentFiles(!showRecentFiles)}
                    type="button"
                  >
                    {showRecentFiles ? '收起' : '更多'}
                  </button>
                )}
              </div>
              {recentFiles.length === 0 ? (
                <div className={styles.emptyRecentFiles}>暂无最近加载的文件</div>
              ) : (
                <>
                  {(showRecentFiles ? recentFiles : recentFiles.slice(0, 3)).map((file, index) => (
                    <div
                      key={`${file.name}-${file.timestamp}-${index}`}
                      className={styles.recentFileItem}
                    >
                      <div
                        className={styles.recentFileInfo}
                        onClick={() => handleRecentFileClick(file)}
                      >
                        <span className={styles.recentFileName}>{file.name}</span>
                        {file.type === 'url' && (
                          <span className={styles.recentFileType}>
                            {file.urls && file.urls.length > 1 ? `${file.urls.length}个URL` : 'URL'}
                          </span>
                        )}
                      </div>
                      <button
                        className={styles.removeRecentBtn}
                        onClick={(e) => handleRemoveRecentFile(e, file)}
                        type="button"
                        title="删除"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  )
})

