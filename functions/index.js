/**
 * SMIKOLE Cloud Functions
 *
 * 1. checkAiAnomaly: Push notification dari prediksi AI saat risk warning/danger.
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

// Inisialisasi Firebase Admin
initializeApp();
const db = getFirestore();

// ═══════════════════════════════════════════════════════
// 1. FUNGSI UTILITAS
// ═══════════════════════════════════════════════════════

/**
 * Ambil userId pemilik kolam dari field "userId" di pond document
 */
async function getPondOwner(pondId) {
  const pondDoc = await db.collection("ponds").doc(pondId).get();
  if (!pondDoc.exists) return null;
  return pondDoc.data().userId || null;
}

/**
 * Kirim FCM push notification ke semua fcmTokens milik user assigned
 */
async function sendFcmToUser(userId, title, message) {
  try {
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return;
    const fcmTokens = userDoc.data().fcmTokens || [];
    if (fcmTokens.length === 0) return;

    const payload = {
      notification: { title, body: message },
      data: { url: "/notifikasi", type: "ai_alert" },
    };

    const tokensToRemove = [];

    const promises = fcmTokens.map((token) =>
      getMessaging()
        .send({ ...payload, token })
        .catch((e) => {
          console.error("FCM Send Error untuk token:", token, e.code, e.message);
          if (
            e.code === "messaging/invalid-registration-token" ||
            e.code === "messaging/registration-token-not-registered"
          ) {
            tokensToRemove.push(token);
          }
        })
    );
    await Promise.all(promises);

    // Hapus token yang mati dari Firestore agar tidak menumpuk (Auto Cleanup)
    if (tokensToRemove.length > 0) {
      await userRef.update({
        fcmTokens: FieldValue.arrayRemove(...tokensToRemove)
      });
      console.log(`[FCM] Cleanup: Dihapus ${tokensToRemove.length} token usang untuk user: ${userId}`);
    }

    const successfulSends = fcmTokens.length - tokensToRemove.length;
    console.log(`[FCM] Push disebar ke ${successfulSends} device aktif untuk user: ${userId}`);
  } catch (err) {
    console.error("Gagal mengirim FCM ke user:", userId, err);
  }
}

// ═══════════════════════════════════════════════════════
// 2. CLOUD FUNCTION: AI ANOMALY
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
      riskStatus === "warning"

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
    // Jika recommendations berwujud array of object (contoh: [{"0": "teks..."}]), ambil value-nya
    const formattedRecs = recommendations
      .map(rec => {
        let text = "";
        if (typeof rec === 'object' && rec !== null) {
          // Ambil value pertama dari object tsb
          text = Object.values(rec)[0] || "";
        } else if (typeof rec === 'string') {
          text = rec;
        }
        return text.replace(/^[\u{1F300}-\u{1FFFF}\u{2600}-\u{26FF}\s]+/u, "").trim();
      })
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
