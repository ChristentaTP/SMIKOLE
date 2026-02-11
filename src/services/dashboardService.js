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

  // Path to realtime collection: ponds > kolam1 > realtime
  const collectionRef = collection(db, "ponds", pondId, "realtime")
  
  // EFFICIENT QUERY: Get only the latest document from server
  // This requires a Firebase index on 'timestamp' field
  const q = query(
    collectionRef, 
    orderBy("timestamp", "desc"),  // Sort by timestamp descending (newest first)
    limit(1)  // Only get 1 document (the latest)
  )
  
  // Listen to query result
  const unsubscribe = onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      console.log("No documents found in realtime collection")
      callback({})
      return
    }
    
    // Get the only document (latest)
    const doc = snapshot.docs[0]
    const data = doc.data()
    
    console.log("Latest realtime data from document:", doc.id)
    console.log("Data:", data)
    
    // Map Firestore fields to dashboard format - flat structure
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
        value: data.Aktuator === true || data.Aktuator === "tum" ? "ON" : "OFF",
        timestamp: data.timestamp
      }
    }
    
    callback(sensors)
  }, (error) => {
    console.error("Error subscribing to sensors:", error)
    
    // If error mentions index, provide helpful message
    if (error.message?.includes("index")) {
      console.error("(ERROR) Firebase Index Required!")
      console.error("Click the link in the error above to create the index automatically")
    }
    
    callback({})
  })

  return unsubscribe
}
