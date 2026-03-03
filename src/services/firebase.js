// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
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
 * Request notification permission, get FCM token, and save it to Firestore user document.
 * Token disimpan SATU per browser: jika token baru berbeda dari yang tersimpan sebelumnya
 * (misal karena pindah dari localhost ke production), token lama diganti agar tidak dobel.
 * @param {string} userId - Firebase Auth UID (required to save token)
 * @returns {Promise<string|null>} FCM token or null if denied/unsupported
 */
export const requestNotificationPermission = async (userId) => {
  try {
    // Cek apakah browser mendukung notifikasi dan service worker
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      console.warn('Push notifications not supported on this browser')
      return null
    }

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

    // Register service worker secara eksplisit (WAJIB untuk mobile/PWA)
    // Mobile browser sering gagal jika Firebase auto-register SW
    const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    })
    console.log("Service Worker registered with scope:", swRegistration.scope)

    // Tunggu SW aktif sebelum request token
    await navigator.serviceWorker.ready

    // Pass serviceWorkerRegistration ke getToken agar Firebase pakai SW yang sudah terdaftar
    const token = await getToken(msg, {
      vapidKey,
      serviceWorkerRegistration: swRegistration
    })
    console.log("FCM Token obtained:", token ? token.substring(0, 20) + "..." : "none")

    // Save token to Firestore if userId is provided
    if (userId && token) {
      const userRef = doc(db, "users", userId)
      
      // Ambil token lama yang pernah disimpan di localStorage (dari browser ini)
      const prevToken = localStorage.getItem("smikole-fcm-token")
      
      // Baca array fcmTokens saat ini dari Firestore
      const userDoc = await getDoc(userRef)
      const currentTokens = userDoc.exists() ? (userDoc.data().fcmTokens || []) : []
      
      // Buat array baru: hapus token lama dari browser ini, tambahkan yang baru
      let updatedTokens = currentTokens.filter(t => t !== prevToken && t !== token)
      updatedTokens.push(token)
      
      await updateDoc(userRef, { fcmTokens: updatedTokens })
      
      // Simpan token baru ke localStorage agar bisa di-cleanup nanti
      localStorage.setItem("smikole-fcm-token", token)
      
      console.log("FCM token saved to Firestore for user:", userId)
    }

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