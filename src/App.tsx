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
  const {
    tweets,
    loading,
    loadingMore,
    error,
    importNotice,
    totalTweets,
    loadTweetsFromFile,
    loadMoreTweets,
    hasMore,
    allImages,
    userStats,
    activeAuthorScreenName,
    toggleAuthorFilter,
    clearAuthorFilter,
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

  useEffect(() => {
    if (!importNotice) {
      return
    }
    showToast(importNotice.message, importNotice.type, 7000)
  }, [importNotice, showToast])

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

  const handleUserFilter = useCallback((screenName: string) => {
    toggleAuthorFilter(screenName)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    if (isMobileViewport()) {
      setMobilePage('home')
      setCurrentPage('home')
    }
  }, [toggleAuthorFilter])

  const handleClearUserFilter = useCallback(() => {
    clearAuthorFilter()
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    if (isMobileViewport()) {
      setMobilePage('home')
      setCurrentPage('home')
    }
  }, [clearAuthorFilter])

  const shouldHideMainContent = isMobileViewport() && mobilePage !== 'home'

  return (
    <>
      {mobilePage === 'stats' && (
        <div className={styles.mobilePageContainer}>
          <MobileStatsPage
            totalTweets={totalTweets}
            userStats={userStats}
            activeAuthorScreenName={activeAuthorScreenName}
            onUserCountClick={handleUserFilter}
            onClearFilter={handleClearUserFilter}
            onBack={handleMobileBack}
          />
        </div>
      )}
      {mobilePage === 'load' && (
        <div className={styles.mobilePageContainer}>
          <MobileLoadPage
            onBack={handleMobileBack}
            onFileSelect={handleFileSelect}
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
              loading={loading}
            />
          </div>
          <div className={styles.mobileOnly}>
            <MobileHeader currentPage={currentPage} />
          </div>
          <TweetsContainer
            tweets={tweets}
            loading={loading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            error={error}
            onLoadMore={loadMoreTweets}
            onImageClick={handleImageClick}
          />
        </main>
        <RightSidebar
          totalTweets={totalTweets}
          userStats={userStats}
          activeAuthorScreenName={activeAuthorScreenName}
          onUserCountClick={handleUserFilter}
          onClearFilter={handleClearUserFilter}
        />
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
