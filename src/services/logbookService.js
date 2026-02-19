import { db } from "./firebase"
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp 
} from "firebase/firestore"

/**
 * Subscribe to logbooks for a specific user (real-time)
 * Firestore collection: logs
 * Fields: judul, kejadian, kolamId, userId, waktu
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
      
      // Format waktu for display
      let date = ""
      if (data.waktu?.toDate) {
        const d = data.waktu.toDate()
        date = d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
      } else if (typeof data.waktu === "string") {
        date = data.waktu
      }

      return {
        id: doc.id,
        title: data.judul || "",
        description: data.kejadian || "",
        date: date,
        kolamId: data.kolamId || "",
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
 * Create a new logbook entry
 * @param {object} data - { title, date, description }
 * @param {string} userId - User ID
 */
export const createLogbook = async (data, userId) => {
  const docRef = await addDoc(collection(db, "logs"), {
    judul: data.title,
    kejadian: data.description || "",
    kolamId: "kolam1",
    userId,
    waktu: serverTimestamp()
  })
  return { id: docRef.id, ...data }
}

/**
 * Delete a logbook entry
 * @param {string} id - Document ID
 */
export const deleteLogbook = async (id) => {
  await deleteDoc(doc(db, "logs", id))
}
