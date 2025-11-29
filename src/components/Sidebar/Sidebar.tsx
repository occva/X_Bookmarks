import styles from './Sidebar.module.css'

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarContent}>
        <div className={styles.logo}>
          <svg viewBox="0 0 24 24" className={styles.twitterLogo}>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>
        <nav className={styles.navMenu}>
          <a href="#" className={`${styles.navItem} ${styles.active}`}>
            <svg viewBox="0 0 24 24">
              <path d="M12 1.696L.622 8.807l1.06 1.696L3 9.679V19.5C3 20.881 4.119 22 5.5 22h13c1.381 0 2.5-1.119 2.5-2.5V9.679l1.318.824 1.06-1.696L12 1.696zM12 16.5c-1.933 0-3.5-1.567-3.5-3.5s1.567-3.5 3.5-3.5 3.5 1.567 3.5 3.5-1.567 3.5-3.5 3.5z" />
            </svg>
            <span>首页</span>
          </a>
          <a href="#" className={styles.navItem}>
            <svg viewBox="0 0 24 24">
              <path d="M19.9 23.5c-.2 0-.4 0-.6-.1L12 20.1l-7.3 3.3c-.2.1-.4.1-.6.1-.2 0-.3 0-.5-.1-.4-.1-.7-.4-.8-.8 0-.2 0-.3.1-.5l1.4-7.6L.4 9.1c-.2-.2-.3-.5-.3-.8 0-.4.1-.7.4-1l6.4-5.6L9.1.1c.2-.2.5-.3.8-.3.3 0 .6.1.8.3l2.3 1.6 6.4 5.6c.3.3.4.6.4 1 0 .3-.1.6-.3.8l-4.7 4.1 1.4 7.6c0 .2.1.4.1.5 0 .4-.3.7-.7.8-.1.1-.2.1-.3.1z" />
            </svg>
            <span>书签</span>
          </a>
        </nav>
      </div>
    </aside>
  )
}

