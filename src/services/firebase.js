// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Firebase Cloud Messaging
let messaging = null

/**
 * Get FCM messaging instance (lazy init, only in supported browsers)
 */
const getMessagingInstance = () => {
  if (messaging) return messaging
  try {
    messaging = getMessaging(app)
    return messaging
  } catch (error) {
    console.warn("FCM not supported in this browser:", error.message)
    return null
  }
}

/**
 * Request notification permission and get FCM token
 * @returns {Promise<string|null>} FCM token or null if denied
 */
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission()
    
    if (permission !== 'granted') {
      console.log('Notification permission denied')
      return null
    }

    const msg = getMessagingInstance()
    if (!msg) return null

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
    if (!vapidKey) {
      console.warn("VAPID key not configured. Add VITE_FIREBASE_VAPID_KEY to .env")
      return null
    }

    const token = await getToken(msg, { vapidKey })
    console.log("FCM Token:", token)
    return token
  } catch (error) {
    console.error("Error getting FCM token:", error)
    return null
  }
}

/**
 * Listen for foreground messages (when app is open)
 * @param {function} callback - Called with message payload
 * @returns {function} Unsubscribe function
 */
export const onForegroundMessage = (callback) => {
  const msg = getMessagingInstance()
  if (!msg) return () => {}
  
  return onMessage(msg, (payload) => {
    console.log("Foreground message received:", payload)
    callback(payload)
  })
}