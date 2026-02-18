/**
 * Logbook Service
 * Service layer untuk CRUD operations logbook menggunakan Firestore
 * Collection: "logs"
 * Fields: judul, kejadian, kolamId, userId, waktu
 */

import { db } from "./firebase"
import { 
  collection, 
  getDocs, 
  getDoc, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp 
} from "firebase/firestore"

const COLLECTION_NAME = "logs"

/**
 * Helper: Map Firestore document to frontend logbook format
 */
const mapDocToLogbook = (docSnap) => {
  const data = docSnap.data()
  
  // Handle waktu field (Firestore Timestamp → readable date string)
  let dateStr = "-"
  if (data.waktu) {
    let dateObj
    if (data.waktu.toDate) {
      // Firestore Timestamp object
      dateObj = data.waktu.toDate()
    } else if (typeof data.waktu === 'string' || typeof data.waktu === 'number') {
      dateObj = new Date(data.waktu)
    } else {
      dateObj = new Date()
    }
    dateStr = dateObj.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
  }

  return {
    id: docSnap.id,
    title: data.judul || "-",
    date: dateStr,
    description: data.kejadian || "",
    kolamId: data.kolamId || "",
    userId: data.userId || ""
  }
}

/**
 * Get all logbook entries, ordered by waktu descending (newest first)
 * @returns {Promise<Array>} Array of logbook entries
 */
export const getLogbooks = async () => {
  const collectionRef = collection(db, COLLECTION_NAME)
  const q = query(collectionRef, orderBy("waktu", "desc"))
  
  const snapshot = await getDocs(q)
  return snapshot.docs.map(mapDocToLogbook)
}

/**
 * Get single logbook entry by ID
 * @param {string} id - Firestore document ID
 * @returns {Promise<Object|null>} Logbook entry or null
 */
export const getLogbookById = async (id) => {
  const docRef = doc(db, COLLECTION_NAME, id)
  const docSnap = await getDoc(docRef)
  
  if (!docSnap.exists()) return null
  return mapDocToLogbook(docSnap)
}

/**
 * Create new logbook entry
 * @param {Object} data - Logbook data { title, date, description }
 * @returns {Promise<Object>} Created logbook entry with Firestore ID
 */
export const createLogbook = async (data, userId = "001") => {
  const collectionRef = collection(db, COLLECTION_NAME)
  
  const newDoc = {
    judul: data.title || "",
    kejadian: data.description || "",
    kolamId: "kolam1",  // Default kolam
    userId: userId,
    waktu: serverTimestamp()
  }
  
  const docRef = await addDoc(collectionRef, newDoc)
  
  // Return the created logbook in frontend format
  return {
    id: docRef.id,
    title: newDoc.judul,
    date: data.date || new Date().toLocaleDateString('id-ID', { 
      day: 'numeric', month: 'long', year: 'numeric' 
    }),
    description: newDoc.kejadian,
    kolamId: newDoc.kolamId,
    userId: newDoc.userId
  }
}

/**
 * Update existing logbook entry
 * @param {string} id - Firestore document ID
 * @param {Object} data - Updated data
 * @returns {Promise<Object|null>} Updated logbook or null
 */
export const updateLogbook = async (id, data) => {
  const { updateDoc } = await import("firebase/firestore")
  const docRef = doc(db, COLLECTION_NAME, id)
  
  const updateData = {}
  if (data.title !== undefined) updateData.judul = data.title
  if (data.description !== undefined) updateData.kejadian = data.description
  if (data.kolamId !== undefined) updateData.kolamId = data.kolamId
  
  await updateDoc(docRef, updateData)
  return await getLogbookById(id)
}

/**
 * Delete logbook entry
 * @param {string} id - Firestore document ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteLogbook = async (id) => {
  const docRef = doc(db, COLLECTION_NAME, id)
  await deleteDoc(docRef)
  return true
}
