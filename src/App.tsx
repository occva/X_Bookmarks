import { useMemo, useRef, useState, useEffect } from 'react'
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
import styles from './App.module.css'

type MobilePage = 'home' | 'bookmarks' | 'stats' | 'load'

function App() {
  const headerRef = useRef<HeaderRef>(null)
  const [mobilePage, setMobilePage] = useState<MobilePage>('home')
  const [currentPage, setCurrentPage] = useState<'home' | 'bookmarks'>('home')
  const [justLoaded, setJustLoaded] = useState(false)
  const prevLoadingRef = useRef(false)
  const {
    tweets,
    loading,
    error,
    loadTweetsFromFile,
    loadTweetsFromURL,
    getAllImages,
    userStats,
  } = useTweets()

  const allImages = useMemo(() => getAllImages(), [tweets])

  const imageModal = useImageModal(allImages)
  const toast = useToast()

  const findImageIndex = (imageInfo: { url: string; tweetId: string; index: number }) => {
    return allImages.findIndex(
      (img) => img.url === imageInfo.url && img.tweetId === imageInfo.tweetId
    )
  }

  const handleImageClick = (imageInfo: { url: string; tweetId: string; index: number }) => {
    const index = findImageIndex(imageInfo)
    if (index !== -1) {
      imageModal.openModal(index)
    }
  }

  const handleFileSelect = (file: File | File[]) => {
    setJustLoaded(true)
    loadTweetsFromFile(file)
  }

  const handleURLLoad = (url: string | string[]) => {
    setJustLoaded(true)
    loadTweetsFromURL(url)
  }

  useEffect(() => {
    prevLoadingRef.current = loading
  }, [])

  useEffect(() => {
    const wasLoading = prevLoadingRef.current
    prevLoadingRef.current = loading

    if (window.innerWidth <= 768 && mobilePage === 'load') {
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
      const lastJSONError = (window as any).__lastJSONError
      if (lastJSONError) {
        toast.showToast(lastJSONError, 'error', 8000)
        // 清除标记
        delete (window as any).__lastJSONError
      }
    }
  }, [error, toast])

  const handleLoadBookmarksClick = () => {
    if (window.innerWidth <= 768) {
      setMobilePage('load')
      setJustLoaded(false)
    } else {
      headerRef.current?.openLoadPanel()
    }
  }

  const handleStatsClick = () => {
    if (window.innerWidth <= 768) {
      setMobilePage('stats')
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleHomeClick = () => {
    if (window.innerWidth <= 768) {
      setMobilePage('home')
      setCurrentPage('home')
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBookmarksClick = () => {
    if (window.innerWidth <= 768) {
      setMobilePage('home')
      setCurrentPage('bookmarks')
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleMobileBack = () => {
    setMobilePage('home')
  }

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
          display:
            typeof window !== 'undefined' &&
            window.innerWidth <= 768 &&
            mobilePage !== 'home'
              ? 'none'
              : 'flex',
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
        isOpen={imageModal.isOpen}
        imageUrl={imageModal.currentImage?.url || ''}
        currentIndex={imageModal.currentIndex}
        totalImages={imageModal.totalImages}
        onClose={imageModal.closeModal}
        onPrev={imageModal.prevImage}
        onNext={imageModal.nextImage}
      />
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
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
