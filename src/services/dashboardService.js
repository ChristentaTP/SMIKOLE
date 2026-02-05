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

  const collectionRef = collection(db, "ponds", pondId, "realtime")
  
  // Listen to realtime subcollection
  const unsubscribe = onSnapshot(collectionRef, (snapshot) => {
    // Get the first document (latest sensor data)
    const doc = snapshot.docs[0]
    
    if (!doc) {
      callback({})
      return
    }
    
    const data = doc.data()
    
    // Map Firestore fields to dashboard format
    const sensors = {
      temperature: {
        value: data.suhu ?? "-",
        timestamp: data.timestamp
      },
      ph: {
        value: data.pH ?? "-",
        timestamp: data.timestamp
      },
      do: {
        value: data.DO ?? "-",
        timestamp: data.timestamp
      },
      Heater: {
        value: data.Aktuator ? "ON" : "OFF",
        timestamp: data.timestamp
      }
    }
    
    callback(sensors)
  }, (error) => {
    console.error("Error subscribing to sensors:", error)
    callback({})
  })

  return unsubscribe
}
