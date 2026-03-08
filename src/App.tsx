import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { Sidebar } from './components/layout/Sidebar/Sidebar'
import { Header, type HeaderRef } from './components/layout/Header/Header'
import { MobileHeader } from './components/layout/MobileHeader/MobileHeader'
import { TweetsContainer } from './components/features/TweetsContainer/TweetsContainer'
import { RightSidebar } from './components/layout/RightSidebar/RightSidebar'
import { ImageModal } from './components/ui/ImageModal/ImageModal'
import { ToastContainer } from './components/ui/Toast/ToastContainer'
import { BottomNavigation } from './components/layout/BottomNavigation/BottomNavigation'
import { MobileStatsPage } from './pages/MobileStatsPage/MobileStatsPage'
import { MobileLoadPage } from './pages/MobileLoadPage/MobileLoadPage'
import { useTweets } from './hooks/useTweets'
import { useImageModal } from './hooks/useImageModal'
import { useToast } from './hooks/useToast'
import { addRecentFile, getRecentFiles } from './utils/storage'
import { getLatestSavedJSONFileURLs } from './services/localFileService'
import type { ImageInfo } from './types'
import styles from './App.module.css'

type MobilePage = 'home' | 'bookmarks' | 'stats' | 'load'
type ImageKey = Pick<ImageInfo, 'url' | 'tweetId' | 'index'>

function getImageMapKey(image: ImageKey): string {
  return `${image.tweetId}:${image.index}:${image.url}`
}

function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.innerWidth <= 768
}

function App() {
  const headerRef = useRef<HeaderRef>(null)
  const [mobilePage, setMobilePage] = useState<MobilePage>('home')
  const [currentPage, setCurrentPage] = useState<'home' | 'bookmarks'>('home')
  const [justLoaded, setJustLoaded] = useState(false)
  const prevLoadingRef = useRef(false)
  const hasAutoLoadedRef = useRef(false) // 标记是否已经自动加载过
  const {
    tweets,
    loading,
    error,
    loadTweetsFromFile,
    loadTweetsFromURL,
    allImages,
    userStats,
  } = useTweets()

  const {
    isOpen,
    currentIndex,
    currentImage,
    totalImages,
    openModal,
    closeModal,
    prevImage,
    nextImage,
  } = useImageModal(allImages)
  const { toasts, showToast, removeToast } = useToast()

  const imageIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    allImages.forEach((img, index) => {
      map.set(getImageMapKey(img), index)
    })
    return map
  }, [allImages])

  const handleImageClick = useCallback((imageInfo: ImageInfo) => {
    const index = imageIndexMap.get(getImageMapKey(imageInfo))
    if (index !== undefined) {
      openModal(index)
    }
  }, [imageIndexMap, openModal])

  const handleFileSelect = useCallback((file: File | File[]) => {
    setJustLoaded(true)
    loadTweetsFromFile(file)
  }, [loadTweetsFromFile])

  const handleURLLoad = useCallback((url: string | string[]) => {
    setJustLoaded(true)
    loadTweetsFromURL(url)
  }, [loadTweetsFromURL])

  // 页面刷新时自动加载最近 URL；若没有 recent 记录则回退到本地 file 最新目录
  useEffect(() => {
    // 防止重复执行
    if (hasAutoLoadedRef.current) {
      return
    }

    // 标记为已执行，避免重复加载
    hasAutoLoadedRef.current = true

    const autoLoad = async () => {
      try {
        const recentFiles = getRecentFiles()
        // 只加载URL类型的最近文件，按时间戳排序，取最新的
        const urlFiles = recentFiles.filter((f) => f.type === 'url')

        if (urlFiles.length > 0) {
          const mostRecent = urlFiles[0] // 已经按时间戳排序，第一个就是最新的
          const urlsToLoad = mostRecent.urls && mostRecent.urls.length > 0
            ? mostRecent.urls
            : (mostRecent.url ? [mostRecent.url] : [])

          if (urlsToLoad.length > 0) {
            setJustLoaded(true)
            loadTweetsFromURL(urlsToLoad)
            return
          }
        }

        const latestLocalURLs = await getLatestSavedJSONFileURLs()
        if (latestLocalURLs.length > 0) {
          const displayName =
            latestLocalURLs.length === 1
              ? '本地最近上传文件'
              : `本地最近上传文件 (${latestLocalURLs.length}个)`
          addRecentFile(
            displayName,
            'url',
            latestLocalURLs[0],
            latestLocalURLs.length > 1 ? latestLocalURLs : undefined
          )
          setJustLoaded(true)
          loadTweetsFromURL(latestLocalURLs)
        }
      } catch (error) {
        console.warn('自动加载最近数据失败:', error)
      }
    }

    void autoLoad()
  }, [loadTweetsFromURL])

  useEffect(() => {
    const wasLoading = prevLoadingRef.current
    prevLoadingRef.current = loading

    if (isMobileViewport() && mobilePage === 'load') {
      if (wasLoading && !loading && justLoaded) {
        if (tweets.length > 0 && !error) {
          const timer = setTimeout(() => {
            setMobilePage('home')
            setJustLoaded(false)
          }, 500)
          return () => clearTimeout(timer)
        } else if (error) {
          setJustLoaded(false)
        }
      }
    }
  }, [loading, tweets.length, mobilePage, justLoaded, error])

  // 监听 JSON 格式错误并显示 Toast
  useEffect(() => {
    if (error) {
      const globalWindow = window as Window & { __lastJSONError?: string }
      const lastJSONError = globalWindow.__lastJSONError
      if (lastJSONError) {
        showToast(lastJSONError, 'error', 8000)
        // 清除标记
        delete globalWindow.__lastJSONError
      }
    }
  }, [error, showToast])

  const handleLoadBookmarksClick = useCallback(() => {
    if (isMobileViewport()) {
      setMobilePage('load')
      setJustLoaded(false)
    } else {
      headerRef.current?.openLoadPanel()
    }
  }, [])

  const handleStatsClick = useCallback(() => {
    if (isMobileViewport()) {
      setMobilePage('stats')
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  const handleHomeClick = useCallback(() => {
    if (isMobileViewport()) {
      setMobilePage('home')
      setCurrentPage('home')
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  const handleBookmarksClick = useCallback(() => {
    if (isMobileViewport()) {
      setMobilePage('home')
      setCurrentPage('bookmarks')
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  const handleMobileBack = useCallback(() => {
    setMobilePage('home')
  }, [])

  const shouldHideMainContent = isMobileViewport() && mobilePage !== 'home'

  return (
    <>
      {mobilePage === 'stats' && (
        <div className={styles.mobilePageContainer}>
          <MobileStatsPage
            totalTweets={tweets.length}
            userStats={userStats}
            onBack={handleMobileBack}
          />
        </div>
      )}
      {mobilePage === 'load' && (
        <div className={styles.mobilePageContainer}>
          <MobileLoadPage
            onBack={handleMobileBack}
            onFileSelect={handleFileSelect}
            onURLLoad={handleURLLoad}
            loading={loading}
          />
        </div>
      )}

      <div
        className={styles.container}
        style={{
          display: shouldHideMainContent ? 'none' : 'flex',
        }}
      >
        <Sidebar />
        <main className={styles.mainContent}>
          <div className={styles.desktopOnly}>
            <Header
              ref={headerRef}
              onFileSelect={handleFileSelect}
              onURLLoad={handleURLLoad}
              loading={loading}
            />
          </div>
          <div className={styles.mobileOnly}>
            <MobileHeader currentPage={currentPage} />
          </div>
          <TweetsContainer
            tweets={tweets}
            loading={loading}
            error={error}
            onImageClick={handleImageClick}
          />
        </main>
        <RightSidebar totalTweets={tweets.length} userStats={userStats} />
      </div>

      <ImageModal
        isOpen={isOpen}
        imageUrl={currentImage?.url || ''}
        currentIndex={currentIndex}
        totalImages={totalImages}
        onClose={closeModal}
        onPrev={prevImage}
        onNext={nextImage}
      />
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <BottomNavigation
        onLoadBookmarksClick={handleLoadBookmarksClick}
        onStatsClick={handleStatsClick}
        onHomeClick={handleHomeClick}
        onBookmarksClick={handleBookmarksClick}
        activePage={mobilePage}
        loading={loading}
      />
    </>
  )
}

export default App
