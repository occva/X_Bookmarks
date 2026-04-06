import { StatsCard } from '../../features/StatsCard/StatsCard'
import type { UserStats } from '../../../hooks/useTweets'
import styles from './RightSidebar.module.css'

interface RightSidebarProps {
  totalTweets: number
  userStats: UserStats[]
  activeAuthorScreenName: string | null
  onUserCountClick: (screenName: string) => void
  onClearFilter: () => void
}

export function RightSidebar({
  totalTweets,
  userStats,
  activeAuthorScreenName,
  onUserCountClick,
  onClearFilter,
}: RightSidebarProps) {
  return (
    <aside className={styles.rightSidebar}>
      <StatsCard
        totalTweets={totalTweets}
        userStats={userStats}
        activeAuthorScreenName={activeAuthorScreenName}
        onUserCountClick={onUserCountClick}
        onClearFilter={onClearFilter}
      />
    </aside>
  )
}
