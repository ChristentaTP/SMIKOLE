import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Vite plugin: Serve firebase-messaging-sw.js secara dinamis
 * 
 */
function firebaseSwPlugin() {
  let envVars = {}

  return {
    name: 'firebase-sw-plugin',

    configResolved(config) {
      envVars = loadEnv(config.mode, config.root)
    },

    // Dev: serve SW via middleware (tidak menulis file)
    configureServer(server) {
      server.middlewares.use('/firebase-messaging-sw.js', (req, res) => {
        res.setHeader('Content-Type', 'application/javascript')
        res.setHeader('Service-Worker-Allowed', '/')
        res.end(generateSwContent(envVars))
      })
    },

    // Build: tambahkan SW ke output bundle (masuk ke dist/, bukan public/)
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'firebase-messaging-sw.js',
        source: generateSwContent(envVars),
      })
    },
  }
}

function generateSwContent(env) {
  return `/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/11.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "${env.VITE_FIREBASE_API_KEY}",
  authDomain: "${env.VITE_FIREBASE_AUTH_DOMAIN}",
  projectId: "${env.VITE_FIREBASE_PROJECT_ID}",
  storageBucket: "${env.VITE_FIREBASE_STORAGE_BUCKET}",
  messagingSenderId: "${env.VITE_FIREBASE_MESSAGING_SENDER_ID}",
  appId: "${env.VITE_FIREBASE_APP_ID}",
});

var messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[SW] Background message received:', payload);
  var title = (payload.notification && payload.notification.title) || 'SMIKOLE';
  var options = {
    body: (payload.notification && payload.notification.body) || 'Anda memiliki notifikasi baru',
    icon: '/logo.svg',
    badge: '/logo.svg',
    tag: (payload.data && payload.data.notificationId) || 'default',
    data: Object.assign({ url: '/notifikasi' }, payload.data || {})
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/notifikasi';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        if (clientList[i].url.indexOf(url) !== -1 && 'focus' in clientList[i]) return clientList[i].focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
`
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    firebaseSwPlugin(),
  ],
})
