import { useState } from 'react'
import type { UserStats } from '../../../hooks/useTweets'
import styles from './StatsCard.module.css'

interface StatsCardProps {
  totalTweets: number
  userStats: UserStats[]
  activeAuthorScreenName?: string | null
  onUserCountClick?: (screenName: string) => void
  onClearFilter?: () => void
}

export function StatsCard({
  totalTweets,
  userStats,
  activeAuthorScreenName = null,
  onUserCountClick,
  onClearFilter,
}: StatsCardProps) {
  const [showUserList, setShowUserList] = useState(true)

  const handleUserClick = (screenName: string) => {
    window.open(`https://twitter.com/${screenName}`, '_blank', 'noopener,noreferrer')
  }

  const handleUserCountClick = (screenName: string) => {
    if (onUserCountClick) {
      onUserCountClick(screenName)
    }
  }

  return (
    <div className={styles.statsCard}>
      <h3>统计信息</h3>
      {activeAuthorScreenName && onClearFilter && (
        <button className={styles.filterIndicator} onClick={onClearFilter} type="button">
          当前筛选：@{activeAuthorScreenName}（点击清除）
        </button>
      )}
      <div className={styles.statItem}>
        <span className={styles.statLabel}>总推文数</span>
        {activeAuthorScreenName && onClearFilter ? (
          <button className={styles.statValueButton} onClick={onClearFilter} type="button">
            {totalTweets}
          </button>
        ) : (
          <span className={styles.statValue}>{totalTweets}</span>
        )}
      </div>
      <div className={styles.statItem}>
        <span className={styles.statLabel}>用户统计</span>
        <button
          className={styles.statValueButton}
          onClick={() => setShowUserList(!showUserList)}
          type="button"
        >
          {userStats.length}
        </button>
      </div>
      {showUserList && (
        <div className={styles.userList}>
          {userStats.length === 0 ? (
            <div className={styles.emptyMessage}>暂无用户数据</div>
          ) : (
            userStats.map((user, index) => (
              <div key={`${user.screenName}-${index}`} className={styles.userItem}>
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{user.name}</span>
                  <button
                    className={styles.userHandle}
                    onClick={() => handleUserClick(user.screenName)}
                    type="button"
                  >
                    @{user.screenName}
                  </button>
                </div>
                {onUserCountClick ? (
                  <button
                    className={`${styles.userCountButton} ${
                      activeAuthorScreenName === user.screenName ? styles.userCountActive : ''
                    }`}
                    onClick={() => handleUserCountClick(user.screenName)}
                    type="button"
                    title={`筛选 @${user.screenName}`}
                  >
                    {user.count}
                  </button>
                ) : (
                  <span className={styles.userCount}>{user.count}</span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
