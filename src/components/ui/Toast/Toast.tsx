import { useEffect } from 'react'
import styles from './Toast.module.css'

interface ToastProps {
  message: string
  type?: 'error' | 'success' | 'warning'
  duration?: number
  onClose: () => void
}

export function Toast({ message, type = 'error', duration = 5000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      <div className={styles.icon}>
        {type === 'error' && '❌'}
        {type === 'success' && '✅'}
        {type === 'warning' && '⚠️'}
      </div>
      <div className={styles.message}>{message}</div>
      <button className={styles.closeBtn} onClick={onClose} type="button" aria-label="关闭">
        ×
      </button>
    </div>
  )
}

