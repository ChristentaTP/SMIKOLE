import { useState, useEffect } from "react"
import MainLayout from "../layout/MainLayout"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faBell, faBellSlash, faCheck, faCheckDouble, faTrash } from "@fortawesome/free-solid-svg-icons"
import { useNotifications } from "../../hooks/useNotifications"
import { markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications } from "../../services/notificationService"
import { requestNotificationPermission, onForegroundMessage } from "../../services/firebase"
import { useAuth } from "../../contexts/AuthContext"

export default function Notifikasi() {
  const { user } = useAuth()
  const userId = user?.uid || "001"
  const { notifications, unreadCount, isLoading } = useNotifications(userId)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)

  // Check if push is already enabled
  useEffect(() => {
    if ('Notification' in window) {
      setPushEnabled(Notification.permission === 'granted')
    }
  }, [])

  // Listen for foreground messages
  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      // Show a simple browser notification when app is in foreground
      if (Notification.permission === 'granted') {
        new Notification(payload.notification?.title || 'SMIKOLE', {
          body: payload.notification?.body || 'Notifikasi baru',
          icon: '/logo.svg'
        })
      }
    })
    return () => unsubscribe()
  }, [])

  const handleEnablePush = async () => {
    setPushLoading(true)
    try {
      const token = await requestNotificationPermission()
      if (token) {
        setPushEnabled(true)
        // TODO: Save token to user's Firestore document for server-side sending
        console.log("Push notification enabled, token:", token)
      }
    } catch (error) {
      console.error("Error enabling push:", error)
    } finally {
      setPushLoading(false)
    }
  }

  const handleMarkAsRead = async (notifId) => {
    try {
      await markAsRead(notifId)
    } catch (error) {
      console.error("Error marking as read:", error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead(userId)
    } catch (error) {
      console.error("Error marking all as read:", error)
    }
  }

  const handleDelete = async (notifId) => {
    try {
      await deleteNotification(notifId)
    } catch (error) {
      console.error("Error deleting notification:", error)
    }
  }

  const handleDeleteAll = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus semua notifikasi?')) return
    try {
      await deleteAllNotifications(userId)
    } catch (error) {
      console.error("Error deleting all notifications:", error)
    }
  }

  return (
    <MainLayout>
      <div className="pb-20 md:pb-0">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold dark:text-white">Notifikasi</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {unreadCount} belum dibaca
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Mark All as Read */}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-[#085C85] dark:text-[#4A9CC7] hover:text-[#064a6a] font-medium flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Tandai semua dibaca"
              >
                <FontAwesomeIcon icon={faCheckDouble} />
                <span className="hidden sm:inline">Tandai Semua</span>
              </button>
            )}
            {/* Delete All */}
            {notifications.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Hapus semua notifikasi"
              >
                <FontAwesomeIcon icon={faTrash} />
                <span className="hidden sm:inline">Hapus Semua</span>
              </button>
            )}
          </div>
        </div>

        {/* Push Notification Toggle */}
        {!pushEnabled && 'Notification' in window && (
          <div className="bg-[#085C85]/10 dark:bg-[#085C85]/20 border border-[#085C85]/30 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FontAwesomeIcon icon={faBellSlash} className="text-[#085C85] dark:text-[#4A9CC7] text-lg" />
              <div>
                <p className="font-medium text-gray-800 dark:text-white text-sm">Push Notification Nonaktif</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Aktifkan untuk menerima notifikasi di perangkat Android</p>
              </div>
            </div>
            <button
              onClick={handleEnablePush}
              disabled={pushLoading}
              className="bg-[#085C85] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#064a6a] transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {pushLoading ? "Loading..." : "Aktifkan"}
            </button>
          </div>
        )}

        {pushEnabled && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 mb-6 flex items-center gap-3">
            <FontAwesomeIcon icon={faBell} className="text-green-600 dark:text-green-400" />
            <p className="text-sm text-green-700 dark:text-green-400 font-medium">Push Notification aktif</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#085C85]"></div>
          </div>
        ) : notifications.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <FontAwesomeIcon icon={faBell} className="text-5xl mb-4" />
            <p className="text-lg font-medium">Tidak ada notifikasi</p>
            <p className="text-sm">Notifikasi baru akan muncul di sini</p>
          </div>
        ) : (
          /* Notification List */
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`rounded-xl p-4 shadow-sm border transition-all duration-200 ${
                  notif.read 
                    ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700' 
                    : 'bg-[#085C85]/5 dark:bg-[#085C85]/10 border-[#085C85]/20 dark:border-[#085C85]/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Icon */}
                  <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    notif.read 
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500' 
                      : 'bg-[#085C85] text-white'
                  }`}>
                    <FontAwesomeIcon icon={faBell} className="text-sm" />
                  </div>

                  {/* Content */}
                  <div className="grow min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-semibold text-sm truncate ${
                        notif.read ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'
                      }`}>
                        {notif.title}
                      </h3>
                      {!notif.read && (
                        <span className="shrink-0 w-2 h-2 bg-[#085C85] rounded-full"></span>
                      )}
                    </div>
                    <p className={`text-sm mb-2 ${
                      notif.read ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {notif.message}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{notif.date}</p>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex items-center gap-1">
                    {!notif.read && (
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="p-2 text-gray-400 hover:text-[#085C85] hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Tandai dibaca"
                      >
                        <FontAwesomeIcon icon={faCheck} className="text-sm" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notif.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Hapus"
                    >
                      <FontAwesomeIcon icon={faTrash} className="text-sm" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
