import styles from './MobileHeader.module.css'

interface MobileHeaderProps {
  currentPage: 'home' | 'bookmarks'
}

export function MobileHeader({ currentPage }: MobileHeaderProps) {
  return (
    <div className={styles.header}>
      <h1>{currentPage === 'home' ? '首页' : '书签'}</h1>
    </div>
  )
}

