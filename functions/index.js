/**
 * SMIKOLE Cloud Functions
 * 
 * Monitors sensor data in Firestore and auto-creates notifications
 * when values exceed defined thresholds.
 * 
 * Trigger: onDocumentCreated("ponds/{pondId}/realtime/{docId}")
 * Action: Create notification in "notifications" collection + send FCM push
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore")
const { initializeApp } = require("firebase-admin/app")
const { getFirestore, Timestamp } = require("firebase-admin/firestore")
const { getMessaging } = require("firebase-admin/messaging")

// Initialize Firebase Admin
initializeApp()
const db = getFirestore()

// ═══════════════════════════════════════════════════════
// THRESHOLD CONFIGURATION (ubah sesuai kebutuhan)
// ═══════════════════════════════════════════════════════
const THRESHOLDS = {
  suhu: {
    min: 25,
    max: 32,
    unit: "°C",
    label: "Suhu",
  },
  pH: {
    min: 6.5,
    max: 8.5,
    unit: "",
    label: "pH",
  },
  DO: {
    min: 4,
    max: null, // no upper limit
    unit: "ppm",
    label: "Oksigen Terlarut (DO)",
  },
}

// Cooldown: jangan kirim notifikasi yang sama dalam 30 menit
const COOLDOWN_MINUTES = 30

/**
 * Check if a similar notification was recently sent (cooldown)
 * @param {string} userId
 * @param {string} titleKey - unique key for notification type
 * @returns {Promise<boolean>} true if should skip (cooldown active)
 */
async function isCooldownActive(userId, titleKey) {
  const cooldownTime = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000)
  
  const snapshot = await db.collection("notifications")
    .where("userId", "==", userId)
    .where("title", "==", titleKey)
    .where("createdAt", ">=", Timestamp.fromDate(cooldownTime))
    .limit(1)
    .get()

  return !snapshot.empty
}

/**
 * Create a notification document in Firestore
 */
async function createNotification(title, message, userId, pondId) {
  await db.collection("notifications").add({
    title,
    message,
    read: false,
    userId,
    createdAt: Timestamp.now(),
    kolamId: pondId,
    recommendationId: "",
  })
}

/**
 * Send FCM push notification to all user's devices
 */
async function sendPushNotification(title, message, userId) {
  try {
    // Get user's FCM tokens from Firestore
    const userDoc = await db.collection("users").doc(userId).get()
    
    if (!userDoc.exists) return
    
    const userData = userDoc.data()
    const fcmTokens = userData.fcmTokens || []
    
    if (fcmTokens.length === 0) return

    const payload = {
      notification: {
        title,
        body: message,
      },
      data: {
        type: "sensor_alert",
        url: "/notifikasi",
      },
    }

    // Send to all tokens
    const promises = fcmTokens.map(token =>
      getMessaging().send({
        ...payload,
        token,
      }).catch(error => {
        console.warn(`Failed to send to token ${token}:`, error.message)
        // TODO: Remove invalid tokens from user document
      })
    )

    await Promise.all(promises)
  } catch (error) {
    console.error("Error sending push notification:", error)
  }
}

/**
 * Check sensor values against thresholds and generate alerts
 * @param {Object} sensorData - raw sensor data from Firestore
 * @param {string} pondId - pond document ID
 * @returns {Array} array of alert objects { title, message }
 */
function checkThresholds(sensorData, pondId) {
  const alerts = []

  for (const [field, config] of Object.entries(THRESHOLDS)) {
    const value = sensorData[field]
    
    // Skip if value is missing or not a number
    if (value === undefined || value === null || isNaN(Number(value))) continue
    
    const numValue = Number(value)
    const pondLabel = pondId.replace("kolam", "Kolam ")

    // Check minimum threshold
    if (config.min !== null && numValue < config.min) {
      alerts.push({
        title: `Peringatan ${config.label}`,
        message: `${config.label} di ${pondLabel} terlalu rendah: ${numValue}${config.unit} (batas min: ${config.min}${config.unit})`,
      })
    }

    // Check maximum threshold
    if (config.max !== null && numValue > config.max) {
      alerts.push({
        title: `Peringatan ${config.label}`,
        message: `${config.label} di ${pondLabel} terlalu tinggi: ${numValue}${config.unit} (batas max: ${config.max}${config.unit})`,
      })
    }
  }

  return alerts
}

// ═══════════════════════════════════════════════════════
// CLOUD FUNCTION: Monitor sensor data
// ═══════════════════════════════════════════════════════
exports.checkSensorThreshold = onDocumentCreated(
  "ponds/{pondId}/realtime/{docId}",
  async (event) => {
    const snapshot = event.data
    if (!snapshot) return

    const sensorData = snapshot.data()
    const pondId = event.params.pondId

    console.log(`New sensor data for ${pondId}:`, JSON.stringify(sensorData))

    // Check thresholds
    const alerts = checkThresholds(sensorData, pondId)

    if (alerts.length === 0) {
      console.log("All sensor values within normal range.")
      return
    }

    console.log(`Found ${alerts.length} threshold alert(s)`)

    // Default userId — nanti bisa diubah sesuai pond ownership
    const userId = "001"

    // Process each alert
    for (const alert of alerts) {
      // Check cooldown to prevent spam
      const cooldown = await isCooldownActive(userId, alert.title)
      if (cooldown) {
        console.log(`Cooldown active for "${alert.title}", skipping.`)
        continue
      }

      // Create in-app notification
      await createNotification(alert.title, alert.message, userId, pondId)
      console.log(`Notification created: "${alert.title}"`)

      // Send push notification
      await sendPushNotification(alert.title, alert.message, userId)
      console.log(`Push notification sent: "${alert.title}"`)
    }
  }
)
