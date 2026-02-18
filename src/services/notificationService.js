/**
 * Notification Service
 * Realtime notifications dari Firestore collection "notifications"
 * + Firebase Cloud Messaging (FCM) untuk push notification
 */

import { db } from "./firebase"
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDocs,
  writeBatch
} from "firebase/firestore"

const COLLECTION_NAME = "notifications"

/**
 * Subscribe to notifications for a specific user (realtime)
 * @param {string} userId - User ID
 * @param {function} callback - Function to call with array of notifications
 * @returns {function} Unsubscribe function
 */
export const subscribeToNotifications = (userId, callback) => {
  if (!userId) {
    callback([])
    return () => {}
  }

  const collectionRef = collection(db, COLLECTION_NAME)
  const q = query(
    collectionRef,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  )

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(docSnap => {
      const data = docSnap.data()
      
      // Handle createdAt timestamp
      let dateStr = "-"
      if (data.createdAt) {
        let dateObj
        if (data.createdAt.toDate) {
          dateObj = data.createdAt.toDate()
        } else {
          dateObj = new Date(data.createdAt)
        }
        dateStr = dateObj.toLocaleDateString('id-ID', { 
          day: 'numeric', month: 'long', year: 'numeric' 
        })
        const timeStr = dateObj.toLocaleTimeString('id-ID', {
          hour: '2-digit', minute: '2-digit', hour12: false
        })
        dateStr = `${dateStr}, ${timeStr}`
      }

      return {
        id: docSnap.id,
        title: data.title || "",
        message: data.message || "",
        read: data.read || false,
        date: dateStr,
        createdAt: data.createdAt,
        recommendationId: data.recommendationId || "",
        userId: data.userId || ""
      }
    })

    callback(notifications)
  }, (error) => {
    console.error("Error subscribing to notifications:", error)
    
    if (error.message?.includes("index")) {
      console.error("Firebase Index Required! Click the link in the error above to create it.")
    }
    
    callback([])
  })

  return unsubscribe
}

/**
 * Get realtime unread notification count
 * @param {string} userId - User ID
 * @param {function} callback - Function to call with unread count
 * @returns {function} Unsubscribe function
 */
export const subscribeToUnreadCount = (userId, callback) => {
  if (!userId) {
    callback(0)
    return () => {}
  }

  const collectionRef = collection(db, COLLECTION_NAME)
  const q = query(
    collectionRef,
    where("userId", "==", userId),
    where("read", "==", false)
  )

  const unsubscribe = onSnapshot(q, (snapshot) => {
    callback(snapshot.size)
  }, (error) => {
    console.error("Error subscribing to unread count:", error)
    callback(0)
  })

  return unsubscribe
}

/**
 * Mark a single notification as read
 * @param {string} notifId - Notification document ID
 * @returns {Promise<boolean>}
 */
export const markAsRead = async (notifId) => {
  const docRef = doc(db, COLLECTION_NAME, notifId)
  await updateDoc(docRef, { read: true })
  return true
}

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
export const markAllAsRead = async (userId) => {
  const collectionRef = collection(db, COLLECTION_NAME)
  const q = query(
    collectionRef,
    where("userId", "==", userId),
    where("read", "==", false)
  )

  const snapshot = await getDocs(q)
  
  if (snapshot.empty) return true

  const batch = writeBatch(db)
  snapshot.docs.forEach(docSnap => {
    batch.update(docSnap.ref, { read: true })
  })
  
  await batch.commit()
  return true
}

/**
 * Delete a notification
 * @param {string} notifId - Notification document ID
 * @returns {Promise<boolean>}
 */
export const deleteNotification = async (notifId) => {
  const docRef = doc(db, COLLECTION_NAME, notifId)
  await deleteDoc(docRef)
  return true
}
