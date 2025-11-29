import { StatsCard } from '../../components/features/StatsCard/StatsCard'
import type { UserStats } from '../../hooks/useTweets'
import styles from './MobileStatsPage.module.css'

interface MobileStatsPageProps {
  totalTweets: number
  userStats: UserStats[]
  onBack: () => void
}

export function MobileStatsPage({ totalTweets, userStats, onBack }: MobileStatsPageProps) {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={onBack} type="button">
          <svg viewBox="0 0 24 24" className={styles.backIcon}>
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <h2>统计信息</h2>
        <div className={styles.placeholder} />
      </div>
      <div className={styles.content}>
        <StatsCard totalTweets={totalTweets} userStats={userStats} />
      </div>
    </div>
  )
}
