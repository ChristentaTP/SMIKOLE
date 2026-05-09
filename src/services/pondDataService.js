/**
 * Pond Data Service
 * Operasi data management untuk kolam: fetch all data & flush (hapus semua)
 * Subcollections: realtime, ai, fcr
 */

import { db } from "./firebase"
import {
  collection,
  getDocs,
  query,
  orderBy,
  writeBatch,
  doc
} from "firebase/firestore"

/**
 * Parse any timestamp format to Date object
 */
const parseTimestamp = (ts) => {
  if (!ts) return new Date(0)
  if (ts.toDate) return ts.toDate()
  if (typeof ts === "number") return new Date(ts)
  if (typeof ts === "string") {
    const num = parseInt(ts)
    if (!isNaN(num) && ts.length > 8) return new Date(num)
    return new Date(ts)
  }
  return new Date(0)
}

/**
 * Fetch ALL documents from ponds/{pondId}/realtime
 * @param {string} pondId
 * @returns {Promise<Array>} Array of { id, ...data, _date: Date }
 */
export const fetchAllRealtimeData = async (pondId) => {
  if (!pondId) return []

  try {
    let q
    try {
      q = query(
        collection(db, "ponds", pondId, "realtime"),
        orderBy("timestamp", "desc")
      )
    } catch {
      q = collection(db, "ponds", pondId, "realtime")
    }

    const snapshot = await getDocs(q)
    const data = snapshot.docs.map((docSnap) => {
      const d = docSnap.data()
      return {
        id: docSnap.id,
        ...d,
        _date: parseTimestamp(d.timestamp)
      }
    })

    // Sort descending by date
    data.sort((a, b) => b._date.getTime() - a._date.getTime())
    return data
  } catch (error) {
    console.error("Error fetching realtime data:", error)
    throw error
  }
}

/**
 * Fetch ALL documents from ponds/{pondId}/ai
 * @param {string} pondId
 * @returns {Promise<Array>}
 */
export const fetchAllAiData = async (pondId) => {
  if (!pondId) return []

  try {
    const snapshot = await getDocs(collection(db, "ponds", pondId, "ai"))
    const data = snapshot.docs.map((docSnap) => {
      const d = docSnap.data()
      const tsFromId = parseInt(docSnap.id)
      return {
        id: docSnap.id,
        ...d,
        _date: !isNaN(tsFromId) ? new Date(tsFromId) : parseTimestamp(d.timestamp || d.createdAt)
      }
    })

    data.sort((a, b) => b._date.getTime() - a._date.getTime())
    return data
  } catch (error) {
    console.error("Error fetching AI data:", error)
    throw error
  }
}

/**
 * Fetch ALL documents from ponds/{pondId}/fcr
 * @param {string} pondId
 * @returns {Promise<Array>}
 */
export const fetchAllFcrData = async (pondId) => {
  if (!pondId) return []

  try {
    const snapshot = await getDocs(collection(db, "ponds", pondId, "fcr"))
    const data = snapshot.docs.map((docSnap) => {
      const d = docSnap.data()
      return {
        id: docSnap.id,
        ...d,
        _date: parseTimestamp(d.timestamp || d.createdAt)
      }
    })

    data.sort((a, b) => b._date.getTime() - a._date.getTime())
    return data
  } catch (error) {
    console.error("Error fetching FCR data:", error)
    throw error
  }
}

/**
 * Flush (delete) ALL documents in a subcollection
 * Uses batched deletes (max 500 per batch, Firestore limit)
 * @param {string} pondId
 * @param {string} subcollection - "realtime", "ai", or "fcr"
 * @param {function} onProgress - Optional progress callback (deletedCount, totalCount)
 * @returns {Promise<number>} Total documents deleted
 */
export const flushSubcollection = async (pondId, subcollection, onProgress) => {
  if (!pondId || !subcollection) return 0

  try {
    const collRef = collection(db, "ponds", pondId, subcollection)
    const snapshot = await getDocs(collRef)
    const total = snapshot.size

    if (total === 0) return 0

    // Chunk into batches of 500 (Firestore limit)
    const docs = snapshot.docs
    let deleted = 0

    for (let i = 0; i < docs.length; i += 500) {
      const chunk = docs.slice(i, i + 500)
      const batch = writeBatch(db)
      chunk.forEach((docSnap) => {
        batch.delete(doc(db, "ponds", pondId, subcollection, docSnap.id))
      })
      await batch.commit()
      deleted += chunk.length
      if (onProgress) onProgress(deleted, total)
    }

    return deleted
  } catch (error) {
    console.error(`Error flushing ${subcollection}:`, error)
    throw error
  }
}

/**
 * Flush ALL data subcollections (realtime + ai + fcr)
 * @param {string} pondId
 * @param {function} onProgress - (message: string)
 * @returns {Promise<{realtime: number, ai: number, fcr: number}>}
 */
export const flushAllPondData = async (pondId, onProgress) => {
  const result = { realtime: 0, ai: 0, fcr: 0 }

  if (onProgress) onProgress("Menghapus data realtime...")
  result.realtime = await flushSubcollection(pondId, "realtime", (d, t) => {
    if (onProgress) onProgress(`Menghapus realtime... ${d}/${t}`)
  })

  if (onProgress) onProgress("Menghapus data AI...")
  result.ai = await flushSubcollection(pondId, "ai", (d, t) => {
    if (onProgress) onProgress(`Menghapus AI... ${d}/${t}`)
  })

  if (onProgress) onProgress("Menghapus data FCR...")
  result.fcr = await flushSubcollection(pondId, "fcr", (d, t) => {
    if (onProgress) onProgress(`Menghapus FCR... ${d}/${t}`)
  })

  return result
}
