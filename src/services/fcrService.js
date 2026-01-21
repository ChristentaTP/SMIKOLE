/**
 * FCR Service
 * Service layer untuk kalkulasi dan prediksi FCR (Feed Conversion Ratio)
 * FCR = Total Pakan / Kenaikan Berat
 */

// Static data untuk development
let fcrHistory = [
  { minggu: 1, pakan: 300, kenaikanBerat: 250, fcr: 1.2, fcrPrediksi: 1.25, tanggal: "2025-10-07" },
  { minggu: 2, pakan: 350, kenaikanBerat: 200, fcr: 1.75, fcrPrediksi: 1.3, tanggal: "2025-10-14" },
  { minggu: 3, pakan: 320, kenaikanBerat: 270, fcr: 1.19, fcrPrediksi: 1.5, tanggal: "2025-10-21" },
  { minggu: 4, pakan: 330, kenaikanBerat: 280, fcr: 1.18, fcrPrediksi: 1.2, tanggal: "2025-10-28" },
  { minggu: 5, pakan: 300, kenaikanBerat: 275, fcr: 1.09, fcrPrediksi: 1.15, tanggal: "2025-11-04" },
]

/**
 * Hitung FCR dari pakan dan kenaikan berat
 * @param {number} pakan - Jumlah pakan dalam gram
 * @param {number} kenaikanBerat - Kenaikan berat ikan dalam gram
 * @returns {number} FCR value
 */
export const calculateFCR = (pakan, kenaikanBerat) => {
  if (kenaikanBerat <= 0) return 0
  return Number((pakan / kenaikanBerat).toFixed(2))
}

/**
 * Prediksi FCR untuk minggu depan berdasarkan trend historis
 * Menggunakan simple moving average
 * @param {Array} history - Data historis FCR
 * @returns {number} Prediksi FCR
 */
export const predictNextFCR = (history = fcrHistory) => {
  if (history.length === 0) return 1.5
  
  // Simple moving average dari 3 data terakhir
  const recentData = history.slice(-3)
  const avgFCR = recentData.reduce((sum, item) => sum + item.fcr, 0) / recentData.length
  
  // Slight improvement prediction (assume optimization)
  return Number((avgFCR * 0.95).toFixed(2))
}

/**
 * Rekomendasi jumlah pakan berdasarkan target FCR dan kenaikan berat
 * @param {number} targetFCR - Target FCR yang diinginkan
 * @param {number} expectedWeight - Perkiraan kenaikan berat
 * @returns {number} Rekomendasi pakan dalam gram
 */
export const getRecommendedFeed = (targetFCR, expectedWeight) => {
  return Math.round(targetFCR * expectedWeight)
}

/**
 * Dapatkan status efisiensi berdasarkan nilai FCR
 * @param {number} fcr - Nilai FCR
 * @returns {Object} Status dan warna
 */
export const getFCRStatus = (fcr) => {
  if (fcr <= 1.2) {
    return { 
      label: "Efisien", 
      color: "bg-[#72BB53]",
      textColor: "text-white",
      description: "Sangat Efisien = Produksi Stabil"
    }
  } else if (fcr <= 1.5) {
    return { 
      label: "Kurang Efisien", 
      color: "bg-[#F0DF22]",
      textColor: "text-black",
      description: "Perlu Optimasi Pakan"
    }
  } else {
    return { 
      label: "Tidak Efisien", 
      color: "bg-[#DC3545]",
      textColor: "text-white",
      description: "Perlu Evaluasi Pemberian Pakan"
    }
  }
}

/**
 * Get FCR history data
 * @returns {Promise<Array>} Array of FCR history
 */
export const getHistory = async () => {
  await new Promise(resolve => setTimeout(resolve, 100))
  return [...fcrHistory]
}

/**
 * Add weekly FCR data
 * @param {Object} data - Weekly data { pakan, kenaikanBerat, tanggal }
 * @returns {Promise<Object>} New entry with calculated FCR
 */
export const addWeeklyData = async (data) => {
  await new Promise(resolve => setTimeout(resolve, 100))
  
  const fcr = calculateFCR(data.pakan, data.kenaikanBerat)
  const fcrPrediksi = predictNextFCR()
  
  const newEntry = {
    minggu: fcrHistory.length + 1,
    pakan: data.pakan,
    kenaikanBerat: data.kenaikanBerat,
    fcr,
    fcrPrediksi,
    tanggal: data.tanggal
  }
  
  fcrHistory.push(newEntry)
  return newEntry
}

/**
 * Get chart data formatted for Recharts
 * @returns {Promise<Array>} Formatted chart data
 */
export const getChartData = async () => {
  await new Promise(resolve => setTimeout(resolve, 100))
  
  return fcrHistory.map(item => ({
    name: `Minggu ${item.minggu}`,
    fcrAktual: item.fcr,
    fcrPrediksi: item.fcrPrediksi
  }))
}
