import { db, storage } from "./firebase"
import { 
  collection, 
  addDoc, 
  updateDoc,
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp 
} from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"

/**
 * Subscribe to logbooks for a specific user (real-time)
 */
export const subscribeToLogbooks = (userId, callback) => {
  if (!userId) return () => {}

  const q = query(
    collection(db, "logs"),
    where("userId", "==", userId),
    orderBy("waktu", "desc"),
    limit(50)
  )

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const logbooks = snapshot.docs.map(doc => {
      const data = doc.data()
      
      let d = new Date()
      if (data.waktu?.toDate) {
        d = data.waktu.toDate()
      } else if (typeof data.waktu === "string") {
        d = new Date(data.waktu)
      }
      const date = d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
      const monthYear = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" })

      return {
        id: doc.id,
        title: data.judul || "",
        description: data.kejadian || "",
        date: date,
        monthYear: monthYear,
        kolamId: data.kolamId || "",
        fotoUrls: data.fotoUrls || [],
      }
    })
    callback(logbooks)
  }, (error) => {
    console.error("Error subscribing to logbooks:", error)
    if (error.message?.includes("index")) {
      console.error("Firebase Index Required! Click the link above to create it.")
    }
    callback([])
  })

  return unsubscribe
}

/**
 * Upload multiple images to Firebase Storage
 * @param {File[]} imageFiles - Array of image files
 * @param {string} userId - User ID
 * @param {string} docId - Document ID
 * @returns {Promise<string[]>} Array of download URLs
 */
const uploadLogbookImages = async (imageFiles, userId, docId) => {
  const urls = []
  for (let i = 0; i < imageFiles.length; i++) {
    const storageRef = ref(storage, `logbooks/${userId}/${docId}/${i}`)
    await uploadBytes(storageRef, imageFiles[i])
    const url = await getDownloadURL(storageRef)
    urls.push(url)
  }
  return urls
}

/**
 * Create a new logbook entry with optional images (max 5)
 * @param {object} data - { title, description }
 * @param {string} userId - User ID
 * @param {File[]} imageFiles - Array of image files (max 5)
 */
export const createLogbook = async (data, userId, imageFiles = []) => {
  const docRef = await addDoc(collection(db, "logs"), {
    judul: data.title,
    kejadian: data.description || "",
    kolamId: "kolam1",
    userId,
    waktu: serverTimestamp(),
    fotoUrls: []
  })

  if (imageFiles.length > 0) {
    const fotoUrls = await uploadLogbookImages(imageFiles, userId, docRef.id)
    await updateDoc(docRef, { fotoUrls })
  }

  return { id: docRef.id, ...data }
}

/**
 * Update an existing logbook entry with optional new images
 * @param {string} id - Document ID
 * @param {object} data - { title, description }
 * @param {string} userId - User ID
 * @param {File[]} imageFiles - New image files to upload
 * @param {string[]} keepUrls - Existing URLs to keep
 */
export const updateLogbook = async (id, data, userId = null, imageFiles = [], keepUrls = []) => {
  const docRef = doc(db, "logs", id)
  const updateData = {
    judul: data.title,
    kejadian: data.description || "",
    waktu: serverTimestamp()
  }

  if (userId && (imageFiles.length > 0 || keepUrls.length >= 0)) {
    let newUrls = []
    if (imageFiles.length > 0) {
      // Upload new images starting from index after existing ones
      const startIdx = keepUrls.length
      for (let i = 0; i < imageFiles.length; i++) {
        const storageRef = ref(storage, `logbooks/${userId}/${id}/${startIdx + i}`)
        await uploadBytes(storageRef, imageFiles[i])
        const url = await getDownloadURL(storageRef)
        newUrls.push(url)
      }
    }
    updateData.fotoUrls = [...keepUrls, ...newUrls]
  }

  await updateDoc(docRef, updateData)
  return { id, ...data }
}

/**
 * Delete a logbook entry
 * @param {string} id - Document ID
 */
export const deleteLogbook = async (id) => {
  await deleteDoc(doc(db, "logs", id))
}
