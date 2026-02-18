import { useState, useEffect } from "react"
import { subscribeToNotifications, subscribeToUnreadCount } from "../services/notificationService"

/**
 * Hook for realtime notifications
 * @param {string} userId - User ID to subscribe to
 * @returns {{ notifications, unreadCount, isLoading }}
 */
export function useNotifications(userId = "001") {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Subscribe to notifications
  useEffect(() => {
    setIsLoading(true)
    const unsubscribe = subscribeToNotifications(userId, (data) => {
      setNotifications(data)
      setIsLoading(false)
    })
    return () => unsubscribe()
  }, [userId])

  // Subscribe to unread count
  useEffect(() => {
    const unsubscribe = subscribeToUnreadCount(userId, (count) => {
      setUnreadCount(count)
    })
    return () => unsubscribe()
  }, [userId])

  return { notifications, unreadCount, isLoading }
}
