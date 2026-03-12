/**
 * FCR Service
 * Service layer untuk kalkulasi dan prediksi FCR (Feed Conversion Ratio)
 * FCR = Total Pakan / Kenaikan Berat
 */

/**
 * FCR Service
 * Service layer untuk interaksi dengan API Prediksi FCR LeleGrow AI
 */

import { collection, addDoc, query, orderBy, limit as firestoreLimit, getDocs } from "firebase/firestore";
import { db } from "./firebase"; // Import instance Firestore dari config

const API_BASE_URL = 'https://rf-api-55977556270.asia-southeast2.run.app';

/**
 * Prediksi FCR dan ADG berdasarkan parameter input
 * @param {Object} payload 
 * @param {number} payload.siklus
 * @param {number} payload.DOC
 * @param {number} payload.populasi
 * @param {number} payload.bobot_awal_per_ekor_gr
 * @param {number} payload.pakan_harian_gr
 * @param {number} payload.panjang_periode_hari
 * @returns {Promise<Object>} API response data (metrics and recommendations)
 */
export const predictFCR = async (payload) => {
  try {
    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Gagal memprediksi FCR:", error);
    throw error;
  }
};

/**
 * Menyimpan hasil prediksi ke Firebase Firestore
 * @param {Object} payload Data input awal
 * @param {Object} results Hasil dari API (metrics & recommendations)
 * @param {string} pondId ID Kolam (e.g. "kolam1")
 */
export const savePredictionToFirestore = async (payload, results, pondId) => {
  if (!pondId) {
    console.warn("Pond ID tidak ditemukan.");
    return null;
  }

  try {
    const docData = {
      input: payload,
      metrics: results.metrics,
      predictions: results.predictions,
      recommendations: results.recommendations,
      createdAt: new Date().toISOString(),
      timestamp: Date.now()
    };

    const docRef = await addDoc(collection(db, "ponds", pondId, "fcr"), docData);
    console.log("Riwayat prediksi berhasil disimpan dengan ID: ", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Gagal menyimpan prediksi ke Firestore:", error);
    throw error;
  }
};

/**
 * Mendapatkan riwayat prediksi FCR dari subcollection /ponds/{pondId}/fcr
 * @param {string} pondId - ID Kolam (e.g. "kolam1")
 * @param {number} limitCount - Batas jumlah riwayat yang diambil
 * @returns {Promise<Array>} Data riwayat FCR (terbaru di awal)
 */
export const getHistory = async (pondId, limitCount = 20) => {
  if (!pondId) {
    console.warn("Pond ID tidak ditemukan saat mengambil histori.");
    return [];
  }

  try {
    // Ambil semua data dari /ponds/{pondId}/fcr, urutkan terbaru dulu
    let q;
    try {
      // Coba pakai orderBy timestamp jika field ada
      q = query(
        collection(db, "ponds", pondId, "fcr"),
        orderBy("timestamp", "desc"),
        firestoreLimit(limitCount)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const historyData = [];
        snapshot.forEach((doc) => {
          historyData.push({ id: doc.id, ...doc.data() });
        });
        return historyData;
      }
    } catch {
      // orderBy timestamp gagal (field tidak ada), fallback tanpa orderBy
    }

    // Fallback: ambil semua tanpa ordering, sort client-side
    q = query(
      collection(db, "ponds", pondId, "fcr"),
      firestoreLimit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const historyData = [];

    querySnapshot.forEach((doc) => {
      historyData.push({ id: doc.id, ...doc.data() });
    });

    // Sort client-side: timestamp > createdAt > input.DOC
    historyData.sort((a, b) => {
      const timeA = a.timestamp || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.timestamp || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });

    return historyData;
  } catch (error) {
    console.error("Gagal meload history dari Firestore:", error);
    return [];
  }
};

/**
 * Dapatkan warna badge dan teks berdasarkan status efisiensi FCR
 * @param {string} status - Status efisiensi dari API (e.g. 'Efisien', 'Normal', 'Tidak Efisien')
 * @returns {Object} Konfigurasi warna
 */
export const getFCRStatusStyle = (status) => {
  if (status === 'Efisien') {
    return {
      label: "Efisien",
      color: "bg-[#72BB53]", // Green
      cardBg: "bg-[#72BB53]",
      textColor: "text-white",
      description: "Sangat Efisien = Produksi Stabil"
    };
  } else if (status === 'Normal') {
    return {
      label: "Normal",
      color: "bg-[#F0DF22]", // Yellow
      cardBg: "bg-[#F0DF22]",
      textColor: "text-black",
      description: "Pemberian Pakan Normal"
    };
  } else {
    return {
      label: status || "Tidak Efisien",
      color: "bg-[#DC3545]", // Red
      cardBg: "bg-[#DC3545]",
      textColor: "text-white",
      description: "Perlu Evaluasi Pemberian Pakan"
    };
  }
};

/**
 * Get Url to Download History
 */
export const getExportUrl = () => {
  return `${API_BASE_URL}/export/csv`;
};
