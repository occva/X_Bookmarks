import { useState, useCallback } from 'react'

interface ToastItem {
  id: string
  message: string
  type?: 'error' | 'success' | 'warning'
  duration?: number
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback(
    (message: string, type: 'error' | 'success' | 'warning' = 'error', duration = 5000) => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
      setToasts((prev) => [...prev, { id, message, type, duration }])
    },
    []
  )

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  return {
    toasts,
    showToast,
    removeToast,
  }
}

