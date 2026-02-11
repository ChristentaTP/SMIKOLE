import { db } from "./firebase"
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore"
import { debugLog } from "../utils/debug"

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
  
  // Get multiple documents to sort client-side (to handle string timestamps)
  const q = query(
    collectionRef, 
    orderBy("timestamp", "desc"),
    limit(10)  // Get 10 to ensure we can sort properly
  )
  
  // Listen to query result
  const unsubscribe = onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      debugLog("No documents found in realtime collection")
      callback({})
      return
    }
    
    // Get all documents and convert timestamps
    const docs = snapshot.docs.map(doc => {
      const data = doc.data()
      
      // Handle different timestamp formats
      let date = new Date()
      if (data.timestamp) {
        if (typeof data.timestamp === 'string' || typeof data.timestamp === 'number') {
          date = new Date(parseInt(data.timestamp))
        } else if (data.timestamp.toDate) {
          date = data.timestamp.toDate()
        }
      }
      
      return {
        id: doc.id,
        data: data,
        date: date
      }
    })
    
    // Sort by date to get truly latest (client-side sorting handles string timestamps)
    docs.sort((a, b) => b.date.getTime() - a.date.getTime())
    
    // Get the latest document
    const latestDoc = docs[0]
    const data = latestDoc.data
    
    debugLog("Latest realtime data:", { id: latestDoc.id, timestamp: latestDoc.date })
    
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

/**
 * Subscribe to historical monitoring data for a specific pond
 * @param {string} pondId - ID of the pond
 * @param {function} callback - Function to call with array of historical records
 * @returns {function} - Unsubscribe function
 */
export const subscribeToHistoricalData = (pondId, callback) => {
  if (!pondId) return () => {}

  debugLog("Subscribing to historical data for pond:", pondId)

  // Path to realtime collection: ponds > pondId > realtime
  const collectionRef = collection(db, "ponds", pondId, "realtime")
  
  // Get last 30 records ordered by timestamp descending
  // Reduced from 100 to 30 for better performance (3 pages of 10 items)
  const q = query(
    collectionRef, 
    orderBy("timestamp", "desc"),
    limit(30)  // Fetch 30 records to support pagination
  )
  
  // Listen to query result
  const unsubscribe = onSnapshot(q, (snapshot) => {
    debugLog("Historical data snapshot received:", snapshot.docs.length, "documents")
    
    if (snapshot.empty) {
      debugLog("No historical data found")
      callback([])
      return
    }
    
    // Map documents to historical data format
    const history = snapshot.docs.map(doc => {
      const data = doc.data()
      
      // Handle different timestamp formats
      let date = new Date()
      if (data.timestamp) {
        if (typeof data.timestamp === 'string' || typeof data.timestamp === 'number') {
          // Convert string/number timestamp to Date
          date = new Date(parseInt(data.timestamp))
        } else if (data.timestamp.toDate) {
          // Firebase Timestamp object
          date = data.timestamp.toDate()
        }
      }
      
      return {
        id: doc.id,
        date: date,
        temperature: data.suhu ?? "-",
        ph: data.pH ?? "-",
        do: data.DO ?? "-",
        heater: data.Aktuator === true || data.Aktuator === "tum" ? "ON" : "OFF",
        aiRisk: "Aman" // You can implement AI risk calculation here
      }
    })
    
    // Sort by date descending (newest first) to ensure proper order
    history.sort((a, b) => b.date.getTime() - a.date.getTime())
    
    debugLog("Historical data processed:", history.length, "records")
    callback(history)
  }, (error) => {
    console.error("Error subscribing to historical data:", error)
    
    if (error.message?.includes("index")) {
      console.error("(ERROR) Firebase Index Required!")
      console.error("Click the link in the error above to create the index automatically")
    }
    
    callback([])
  })

  return unsubscribe
}
