/**
 * SMIKOLE Cloud Functions
 *
 * 1. checkSensorAnomaly: Notifikasi ketika sensor melebihi threshold.
 * 2. checkAiAnomaly:     Push notification dari prediksi AI saat risk warning/danger.
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

// Inisialisasi Firebase Admin
initializeApp();
const db = getFirestore();

// ═══════════════════════════════════════════════════════
// 1. KONFIGURASI THRESHOLD SENSOR
// ═══════════════════════════════════════════════════════
const THRESHOLDS = {
  suhu: {
    unit: "°C",
    label: "Suhu Air",
    check: (val) => {
      if (val >= 25 && val <= 30) return null;
      if ((val >= 23 && val < 25) || (val > 30 && val <= 32)) return "Waspada";
      return "Bahaya";
    },
  },
  pH: {
    unit: "",
    label: "pH Air",
    check: (val) => {
      if (val >= 7.0 && val <= 8.5) return null;
      if ((val >= 6.5 && val < 7.0) || (val > 8.5 && val <= 9.0)) return "Waspada";
      return "Bahaya";
    },
  },
  DO: {
    unit: "ppm",
    label: "Oksigen (DO)",
    check: (val) => {
      if (val >= 3.0) return null;
      if (val >= 2.0 && val < 3.0) return "Waspada";
      return "Bahaya";
    },
  },
};

// Cooldown untuk sensor (60 menit) dan AI (30 menit)
const COOLDOWN_MINUTES = 60;
const AI_COOLDOWN_MINUTES = 30;

// ═══════════════════════════════════════════════════════
// 2. FUNGSI UTILITAS
// ═══════════════════════════════════════════════════════

/**
 * Cek apakah notifikasi sejenis sudah dikirim dalam cooldown period
 */
async function isCooldownActive(userId, kolamId, title, cooldownMinutes = COOLDOWN_MINUTES) {
  const cooldownLimit = new Date(Date.now() - cooldownMinutes * 60 * 1000);
  const snapshot = await db
    .collection("notifications")
    .where("userId", "==", userId)
    .where("title", "==", title)
    .where("kolamId", "==", kolamId)
    .where("createdAt", ">=", Timestamp.fromDate(cooldownLimit))
    .limit(1)
    .get();
  return !snapshot.empty;
}

/**
 * Ambil userId pemilik kolam dari field "userId" di pond document
 */
async function getPondOwner(pondId) {
  const pondDoc = await db.collection("ponds").doc(pondId).get();
  if (!pondDoc.exists) return null;
  return pondDoc.data().userId || null;
}

/**
 * Kirim FCM push notification ke semua fcmTokens milik seorang user
 */
async function sendFcmToUser(userId, title, message) {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) return;
    const fcmTokens = userDoc.data().fcmTokens || [];
    if (fcmTokens.length === 0) return;

    const payload = {
      notification: { title, body: message },
      data: { url: "/notifikasi", type: "ai_alert" },
    };

    const promises = fcmTokens.map((token) =>
      getMessaging()
        .send({ ...payload, token })
        .catch((e) => console.error("FCM Send Error untuk token:", token, e.message))
    );
    await Promise.all(promises);
    console.log(`[FCM] Push disebar ke ${fcmTokens.length} device untuk user: ${userId}`);
  } catch (err) {
    console.error("Gagal mengirim FCM ke user:", userId, err);
  }
}

// ═══════════════════════════════════════════════════════
// 3. CLOUD FUNCTION: SENSOR ANOMALY (tiap 10 detik)
// ═══════════════════════════════════════════════════════

exports.checkSensorAnomaly = onDocumentCreated(
  "ponds/{pondId}/realtime/{docId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const sensorData = snapshot.data();
    const pondId = event.params.pondId;
    const pondLabel = pondId.replace("kolam", "Kolam ");

    console.log(`[SENSOR] Menganalisis data masuk untuk: ${pondId}`);

    const anomalies = [];
    for (const [key, value] of Object.entries(sensorData)) {
      const config = THRESHOLDS[key];
      if (!config) continue;
      const numVal = parseFloat(value);
      if (isNaN(numVal)) continue;

      const severity = config.check(numVal);
      if (severity) {
        anomalies.push({
          title: `Peringatan ${severity}: ${config.label}`,
          message: `Status ${severity} di ${pondLabel}. Nilai tercatat: ${numVal} ${config.unit}.`,
        });
      }
    }

    if (anomalies.length === 0) {
      console.log(`[SENSOR] Data ${pondId} normal.`);
      return;
    }

    const userId = await getPondOwner(pondId);
    if (!userId) {
      console.warn(`[SENSOR] Kolam ${pondId} tidak memiliki field "userId".`);
      return;
    }

    for (const data of anomalies) {
      const onCooldown = await isCooldownActive(userId, pondId, data.title);
      if (onCooldown) {
        console.log(`[SENSOR][COOLDOWN] "${data.title}" ditahan.`);
        continue;
      }

      await db.collection("notifications").add({
        title: data.title,
        message: data.message,
        read: false,
        deleted: false,
        userId,
        kolamId: pondId,
        createdAt: Timestamp.now(),
        recommendationId: "",
        type: "sensor_alert",
      });

      console.log(`[SENSOR] Notifikasi tersimpan: ${data.title}`);

      // Kirim FCM
      await sendFcmToUser(userId, data.title, data.message);
    }
  }
);

// ═══════════════════════════════════════════════════════
// 4. CLOUD FUNCTION: AI ANOMALY (tiap 5 menit)
// ═══════════════════════════════════════════════════════

/**
 * Trigger ketika AI menulis prediksi baru ke ponds/{pondId}/ai/{docId}
 * Kirim push notification ke semua assignedUsers jika risk_status = warning/danger
 */
exports.checkAiAnomaly = onDocumentCreated(
  "ponds/{pondId}/ai/{docId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const aiData = snapshot.data();
    const pondId = event.params.pondId;
    const riskStatus = (aiData.risk_status || "").toLowerCase();

    console.log(`[AI] Prediksi baru untuk kolam ${pondId}, risk_status: ${riskStatus}`);

    // Hanya proses jika status warning atau danger
    const isAnomaly =
      riskStatus === "warning" ||
      riskStatus === "waspada" ||
      riskStatus === "danger" ||
      riskStatus === "bahaya" ||
      riskStatus === "critical";

    if (!isAnomaly) {
      console.log(`[AI] Status aman (${riskStatus}), tidak ada notifikasi.`);
      return;
    }

    // Baca pond untuk mendapatkan assignedUsers dan nama kolam
    const pondDoc = await db.collection("ponds").doc(pondId).get();
    if (!pondDoc.exists) {
      console.warn(`[AI] Kolam ${pondId} tidak ditemukan.`);
      return;
    }

    const pondData = pondDoc.data();
    const pondName = pondData.name || pondId;
    const assignedUsers = pondData.assignedUsers || [];

    if (assignedUsers.length === 0) {
      console.warn(`[AI] Kolam ${pondId} tidak memiliki assignedUsers.`);
      return;
    }

    // Susun judul dan pesan notifikasi
    const riskLabel =
      riskStatus === "warning" || riskStatus === "waspada" ? "Peringatan" : "Bahaya";
    const title = `AI: ${riskLabel} di ${pondName}`;

    // Ambil semua rekomendasi sebagai body notifikasi (strip emoji)
    const recommendations = aiData.recommendations || [];
    
    // Format semua rekomendasi menjadi satu string dengan enter
    const formattedRecs = recommendations
      .map(rec => rec.replace(/^[\u{1F300}-\u{1FFFF}\u{2600}-\u{26FF}\s]+/u, "").trim())
      .filter(rec => rec.length > 0)
      .map((rec, index) => `${index + 1}. ${rec}`)
      .join("\n");

    const message = formattedRecs
      ? `Rekomendasi:\n${formattedRecs}`
      : `AI mendeteksi kondisi ${riskStatus} pada ${pondName}. Segera periksa parameter kolam.`;

    console.log(`[AI] Mengirim ke ${assignedUsers.length} user(s): "${title}"`);

    for (const userId of assignedUsers) {
      // Simpan in-app notification
      await db.collection("notifications").add({
        title,
        message,
        read: false,
        deleted: false,
        userId,
        kolamId: pondId,
        createdAt: Timestamp.now(),
        recommendationId: "",
        type: "ai_alert",
      });

      console.log(`[AI] Notifikasi tersimpan untuk user: ${userId}`);

      // Kirim FCM push notification
      await sendFcmToUser(userId, title, message);
    }

    console.log(`[AI] Selesai memproses ${event.params.docId} untuk kolam ${pondId}.`);
  }
);
