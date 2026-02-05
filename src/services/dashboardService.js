import { db } from "./firebase"
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore"

/**
 * Subscribe to the list of ponds
 * @param {function} callback - Function to call with array of ponds
 * @returns {function} - Unsubscribe function
 */
export const subscribeToPonds = (callback) => {
  const collectionRef = collection(db, "ponds")
  
  // Listen to all ponds
  const unsubscribe = onSnapshot(collectionRef, (snapshot) => {
    const ponds = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    callback(ponds)
  }, (error) => {
    console.error("Error subscribing to ponds:", error)
    callback([])
  })

  return unsubscribe
}

/**
 * Subscribe to sensors for a specific pond
 * @param {string} pondId - ID of the pond
 * @param {function} callback - Function to call with sensor data object
 * @returns {function} - Unsubscribe function
 */
export const subscribeToSensors = (pondId, callback) => {
  if (!pondId) return () => {}

  const collectionRef = collection(db, "ponds", pondId, "sensors")
  
  // Listen to sensors subcollection
  const unsubscribe = onSnapshot(collectionRef, (snapshot) => {
    // Convert array of docs to object map: { temperature: { value: 25, unit: "C", ... }, ph: ... }
    const sensors = {}
    
    snapshot.docs.forEach(doc => {
      const data = doc.data()
      // Use 'type' field as key (e.g., "temperature", "ph") or fallback to document ID
      const key = data.type || doc.id
      sensors[key] = {
        id: doc.id,
        ...data
      }
    })
    
    callback(sensors)
  }, (error) => {
    console.error("Error subscribing to sensors:", error)
    callback({})
  })

  return unsubscribe
}
