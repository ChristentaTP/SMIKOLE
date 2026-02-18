/* eslint-disable no-undef */
/**
 * Firebase Cloud Messaging Service Worker
 * Handles push notifications when the app is in the background
 * 
 * This file MUST be in the public/ folder at the root URL
 */

importScripts('https://www.gstatic.com/firebasejs/11.8.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/11.8.0/firebase-messaging-compat.js')

// Initialize Firebase in the service worker
// Note: These values must match your firebase config
firebase.initializeApp({
  apiKey: self.__FIREBASE_CONFIG__?.apiKey || '',
  authDomain: self.__FIREBASE_CONFIG__?.authDomain || '',
  projectId: self.__FIREBASE_CONFIG__?.projectId || '',
  storageBucket: self.__FIREBASE_CONFIG__?.storageBucket || '',
  messagingSenderId: self.__FIREBASE_CONFIG__?.messagingSenderId || '',
  appId: self.__FIREBASE_CONFIG__?.appId || '',
})

const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload)

  const notificationTitle = payload.notification?.title || 'SMIKOLE'
  const notificationOptions = {
    body: payload.notification?.body || 'Anda memiliki notifikasi baru',
    icon: '/logo.svg',
    badge: '/logo.svg',
    tag: payload.data?.notificationId || 'default',
    data: {
      url: '/notifikasi',
      ...payload.data
    }
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  const url = event.notification.data?.url || '/notifikasi'
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})
