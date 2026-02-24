/**
 * SMIKOLE Cloud Functions
 * 
 * Auto-creates notifications when sensor values exceed defined thresholds.
 * Clean, efficient, and server-side logic based on UI parameters.
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

// Inisialisasi Firebase Admin
initializeApp();
const db = getFirestore();

// ═══════════════════════════════════════════════════════
// 1. KONFIGURASI PARAMETER (Sesuai dengan Dashboard.jsx)
// ═══════════════════════════════════════════════════════
const THRESHOLDS = {
  suhu: {
    unit: "°C",
    label: "Suhu Air",
    check: (val) => {
      if (val >= 25 && val <= 30) return null; // Aman
      if ((val >= 23 && val < 25) || (val > 30 && val <= 32)) return "Waspada";
      return "Bahaya";
    }
  },
  pH: {
    unit: "",
    label: "pH Air",
    check: (val) => {
      if (val >= 7.0 && val <= 8.5) return null; // Aman
      if ((val >= 6.5 && val < 7.0) || (val > 8.5 && val <= 9.0)) return "Waspada";
      return "Bahaya";
    }
  },
  DO: {
    unit: "ppm",
    label: "Oksigen (DO)",
    check: (val) => {
      if (val >= 3.0) return null; // Aman
      if (val >= 2.0 && val < 3.0) return "Waspada";
      return "Bahaya";
    }
  }
};

// Jangan kirim notifikasi kembar dalam jeda x menit (Mencegah spam API sensor)
const COOLDOWN_MINUTES = 60;

// ═══════════════════════════════════════════════════════
// 2. FUNGSI UTILITAS
// ═══════════════════════════════════════════════════════

/**
 * Mencegah pengiriman tipe pesan yang persis sama berulang kali dalam kurun waktu cooldown
 */
async function isCooldownActive(userId, kolamId, title) {
  const cooldownLimit = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000);
  
  const snapshot = await db.collection("notifications")
    .where("userId", "==", userId)
    .where("title", "==", title)
    // Filter kolamId juga, karena bisa jadi 1 user punya lebih dari 1 kolam
    .where("kolamId", "==", kolamId)
    .where("createdAt", ">=", Timestamp.fromDate(cooldownLimit))
    .limit(1)
    .get();

  return !snapshot.empty;
}

/**
 * Mencari userId pemilik kolam (karena realtime data tidak mencatat userId)
 */
async function getPondOwner(pondId) {
  const pondDoc = await db.collection("ponds").doc(pondId).get();
  if (!pondDoc.exists) return null;
  // Jika tidak ada userId di ponds, paksa null (Atau ganti ke fallback userId Anda)
  return pondDoc.data().userId || null;
}

// ═══════════════════════════════════════════════════════
// 3. TRIGGER UTAMA FIRESTORE (CLOUD FUNCTION)
// ═══════════════════════════════════════════════════════

exports.checkSensorAnomaly = onDocumentCreated(
  "ponds/{pondId}/realtime/{docId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const sensorData = snapshot.data();
    const pondId = event.params.pondId; // Contoh: "kolam1"
    const pondLabel = pondId.replace("kolam", "Kolam ");

    console.log(`[START] Menganalisis data masuk untuk: ${pondId}`);

    // Kumpulkan anomali (Waspada/Bahaya)
    const anomalies = [];
    
    // Looping semua key di data sensor yang bersesuaian dengan thresholds kita
    for (const [key, value] of Object.entries(sensorData)) {
      // Pemetaan nama variabel firebase -> fungsi. 
      // Firestore `suhu`, config `suhu` (Cocok)
      // Firestore `DO`, config `DO` (Cocok)
      // Firestore `pH`, config `pH` (Cocok)
      
      const config = THRESHOLDS[key];
      if (!config) continue; // Skip jika tidak ada di konfigurasi threshold
      
      const numVal = parseFloat(value);
      if (isNaN(numVal)) continue;

      const severity = config.check(numVal);
      if (severity) {
         // severity = "Waspada" atau "Bahaya"
         anomalies.push({
           tipe: severity, // "Waspada" / "Bahaya"
           title: `Peringatan ${severity}: ${config.label}`,
           message: `Status ${severity} di ${pondLabel}. Nilai tercatat: ${numVal} ${config.unit}.`,
         });
      }
    }

    if (anomalies.length === 0) {
      console.log(`[OK] Data ${pondId} normal, tidak ada notifikasi yang dipicu.`);
      return;
    }

    // Ada anomali, cari tahu siapa pemilik kolam ini (UserId)
    const userId = await getPondOwner(pondId);
    if (!userId) {
      console.warn(`[SKIP] Kolam ${pondId} tidak memiliki field "userId", notifikasi dibatalkan.`);
      return;
    }

    console.log(`[ALERT] Ditemukan ${anomalies.length} anomali untuk user: ${userId}`);

    // Proses pembuatan notifikasi untuk setiap anomali
    for (const data of anomalies) {
      // 1. Cek Cooldown (jangan kirim jika jenis anomali ini baru saja dikirim)
      const onCooldown = await isCooldownActive(userId, pondId, data.title);
      if (onCooldown) {
         console.log(`[COOLDOWN] Peringatan "${data.title}" ditahan (spam prevention).`);
         continue;
      }

      // 2. Simpan di "notifications" collection -> akan otomatis muncul di web realtime (onSnapshot)
      await db.collection("notifications").add({
        title: data.title,
        message: data.message,
        read: false,        // Default belum dibaca
        deleted: false,     // Dukungan Soft Delete yang tadi kita lihat di Notifikasi.jsx
        userId: userId,
        kolamId: pondId,
        createdAt: Timestamp.now(),     // Tanggal pembuatan untuk sortir
        recommendationId: "", // Field opsional, biarkan kosong dulu
      });

      console.log(`[SUCCESS] Notifikasi tersimpan: ${data.title}`);

      // 3. Mengirimkan Push Notification via FCM
      try {
        const userDoc = await db.collection("users").doc(userId).get();
        if (userDoc.exists) {
            const fcmTokens = userDoc.data().fcmTokens || [];
            if (fcmTokens.length > 0) {
                const payload = {
                    notification: { title: data.title, body: data.message },
                    data: { url: "/notifikasi", type: "alert" }
                };
                
                // Blast ke semua device yg dimiliki oleh user ini
                const promises = fcmTokens.map(token => 
                    getMessaging().send({ ...payload, token }).catch(e => console.error("FCM Send Error:", e))
                );
                await Promise.all(promises);
                console.log(`[FCM] Push Notification disebar ke ${fcmTokens.length} device.`);
            }
        }
      } catch (err) {
         console.error("Gagal mengirim Push Notification:", err);
      }
    }
  }
);
