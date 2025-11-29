import styles from './BottomNavigation.module.css'

interface BottomNavigationProps {
  onLoadBookmarksClick?: () => void
  onStatsClick?: () => void
  onHomeClick?: () => void
  onBookmarksClick?: () => void
  activePage?: 'home' | 'bookmarks' | 'stats' | 'load'
  loading?: boolean
}

export function BottomNavigation({
  onLoadBookmarksClick,
  onStatsClick,
  onHomeClick,
  onBookmarksClick,
  activePage = 'home',
  loading,
}: BottomNavigationProps) {
  const handleHomeClick = () => {
    if (onHomeClick) {
      onHomeClick()
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBookmarksClick = () => {
    if (onBookmarksClick) {
      onBookmarksClick()
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleStatsClick = () => {
    if (onStatsClick) {
      onStatsClick()
    }
  }

  const handleLoadClick = () => {
    if (onLoadBookmarksClick) {
      onLoadBookmarksClick()
    }
  }

  return (
    <nav className={styles.bottomNavigation}>
      <button
        className={`${styles.navButton} ${activePage === 'home' ? styles.active : ''}`}
        onClick={handleHomeClick}
        type="button"
      >
        <svg viewBox="0 0 24 24" className={styles.icon}>
          <path d="M12 1.696L.622 8.807l1.06 1.696L3 9.679V19.5C3 20.881 4.119 22 5.5 22h13c1.381 0 2.5-1.119 2.5-2.5V9.679l1.318.824 1.06-1.696L12 1.696zM12 16.5c-1.933 0-3.5-1.567-3.5-3.5s1.567-3.5 3.5-3.5 3.5 1.567 3.5 3.5-1.567 3.5-3.5 3.5z" />
        </svg>
        <span className={styles.label}>首页</span>
      </button>
      <button
        className={`${styles.navButton} ${activePage === 'bookmarks' ? styles.active : ''}`}
        onClick={handleBookmarksClick}
        type="button"
      >
        <svg viewBox="0 0 24 24" className={styles.icon}>
          <path d="M19.9 23.5c-.2 0-.4 0-.6-.1L12 20.1l-7.3 3.3c-.2.1-.4.1-.6.1-.2 0-.3 0-.5-.1-.4-.1-.7-.4-.8-.8 0-.2 0-.3.1-.5l1.4-7.6L.4 9.1c-.2-.2-.3-.5-.3-.8 0-.4.1-.7.4-1l6.4-5.6L9.1.1c.2-.2.5-.3.8-.3.3 0 .6.1.8.3l2.3 1.6 6.4 5.6c.3.3.4.6.4 1 0 .3-.1.6-.3.8l-4.7 4.1 1.4 7.6c0 .2.1.4.1.5 0 .4-.3.7-.7.8-.1.1-.2.1-.3.1z" />
        </svg>
        <span className={styles.label}>收藏推文</span>
      </button>
      <button
        className={`${styles.navButton} ${activePage === 'stats' ? styles.active : ''}`}
        onClick={handleStatsClick}
        type="button"
      >
        <svg viewBox="0 0 24 24" className={styles.icon}>
          <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
        </svg>
        <span className={styles.label}>统计</span>
      </button>
      <button
        className={`${styles.navButton} ${activePage === 'load' ? styles.active : ''}`}
        onClick={handleLoadClick}
        type="button"
        disabled={loading}
      >
        <svg viewBox="0 0 24 24" className={styles.icon}>
          <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
        </svg>
        <span className={styles.label}>加载收藏</span>
      </button>
    </nav>
  )
}

