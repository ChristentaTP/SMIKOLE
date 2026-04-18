import { db } from "./firebase"
import { collection, doc, onSnapshot, query, orderBy, limit } from "firebase/firestore"
import { debugLog } from "../utils/debug"

/**
 * Subscribe to the list of ponds
 * @param {function} callback - Function to call with array of ponds
 * @returns {function} - Unsubscribe function
 */
export const subscribeToPonds = (callback, userUid = null, userRole = null) => {
  const collectionRef = collection(db, "ponds")
  
  const unsubscribe = onSnapshot(collectionRef, (snapshot) => {
    let ponds = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // If pembudidaya, only show ponds assigned to this user
    if (userRole === "pembudidaya" && userUid) {
      ponds = ponds.filter(pond => {
        const assigned = pond.assignedUsers || []
        return assigned.includes(userUid)
      })
    }

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

  let currentConfigSensors = []
  let currentConfigActuators = []
  let currentSettingsData = {}

  // Step 1: Subscribe to Pond configuration
  const unsubPond = onSnapshot(doc(db, "ponds", pondId), (pondSnap) => {
    if (pondSnap.exists()) {
      const pondData = pondSnap.data()
      currentConfigSensors = pondData.sensors || []
      currentConfigActuators = pondData.actuators || []
    } else {
      currentConfigSensors = []
      currentConfigActuators = []
    }
  })

  // Step 2: Subscribe to Control Settings (to get Auto/Manual mode)
  const unsubSettings = onSnapshot(doc(db, "ponds", pondId, "control", "settings"), (docSnap) => {
    if (docSnap.exists()) {
      currentSettingsData = docSnap.data()
    } else {
      currentSettingsData = {}
    }
  })

  // Step 3: Subscribe to realtime data
  const collectionRef = collection(db, "ponds", pondId, "realtime")
  const q = query(
    collectionRef, 
    orderBy("timestamp", "desc"),
    limit(10)  // Get 10 to ensure we can sort properly
  )
  
  const unsubRealtime = onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      debugLog("No documents found in realtime collection")
      callback({})
      return
    }
    
    // Sort by date truly latest (handling string timestamps)
    const docs = snapshot.docs.map(doc => {
      const data = doc.data()
      let date = new Date()
      if (data.timestamp) {
        if (typeof data.timestamp === 'string' || typeof data.timestamp === 'number') {
          date = new Date(parseInt(data.timestamp))
        } else if (data.timestamp.toDate) {
          date = data.timestamp.toDate()
        }
      }
      return { id: doc.id, data: data, date: date }
    })
    
    docs.sort((a, b) => b.date.getTime() - a.date.getTime())
    const latestDoc = docs[0]
    const data = latestDoc.data
    
    const sensors = {}

    // SCENARIO A: Admin has configured custom sensors
    if (currentConfigSensors.length > 0 || currentConfigActuators.length > 0) {
      // Add configured sensors
      currentConfigSensors.forEach(config => {
        let value = data[config.key] ?? "-"
        
        if (config.type === 'heater' || config.type === 'actuator') {
          if (value === true || value === "tum") value = "ON"
          else if (value === false) value = "OFF"
        }

        // Read IoT status from Firebase realtime data
        // Try status_<key> first (e.g. status_do, status_ph), then type-based mapping (e.g. status_temp for temperature)
        const keyLower = config.key.toLowerCase()
        let iotStatus = data[`status_${keyLower}`]
        if (iotStatus === undefined || iotStatus === null) {
          const typeStatusMap = { 'temperature': 'status_temp', 'ph': 'status_ph', 'do': 'status_do' }
          const statusField = typeStatusMap[config.type]
          if (statusField) iotStatus = data[statusField]
        }

        sensors[config.key] = {
          key: config.key,
          label: config.label || config.key,
          value: value,
          unit: config.unit || "",
          type: config.type || "generic",
          timestamp: data.timestamp,
          iotStatus: iotStatus ?? null,
          thresholds: {
            amanMin: config.amanMin,
            amanMax: config.amanMax,
            waspMin: config.waspMin,
            waspMax: config.waspMax
          }
        }
      })

      // Add configured actuators (so heater card shows on dashboard too)
      currentConfigActuators.forEach(config => {
        let value = data[config.key] ?? "-"
        if (value === true || value === "tum") value = "ON"
        else if (value === false) value = "OFF"

        // Read mode directly from realtime data
        let mode = data.Mode || data.mode || "AUTO"
        if (typeof mode === 'string') mode = mode.toUpperCase()

        sensors[config.key] = {
          key: config.key,
          label: config.label || config.key,
          value: value,
          unit: "",
          type: config.type || "heater",
          timestamp: data.timestamp,
          mode: mode
        }
      })
    } 
    // SCENARIO B: No configuration, fallback to fully dynamic parsing (old behavior)
    else {
      Object.keys(data).forEach(key => {
        // Skip metadata and IoT status fields (status_* are used for card coloring, not displayed as cards)
        if (key === 'timestamp' || key === 'userId' || key === 'kolamId' || key.startsWith('status_')) return;
        
        let type = 'generic'
        let label = key
        let value = data[key] ?? "-"
        let unit = ""
        let mode = null
        
        const keyLower = key.toLowerCase()
        if (keyLower.includes('suhu') || keyLower.includes('temp')) {
          type = 'temperature'; label = 'Suhu Air'; unit = "°C";
        } else if (keyLower.includes('ph')) {
          type = 'ph'; label = 'pH Air';
        } else if (keyLower.includes('do') || keyLower.includes('oksigen')) {
          type = 'do'; label = 'Oksigen Terlarut'; unit = "ppm";
        } else if (keyLower.includes('aktuator') || keyLower.includes('heater')) {
          type = 'heater'
          label = 'Water Heater'
          if (value === true || value === "tum") value = "ON"
          else if (value === false) value = "OFF"
          
          mode = "AUTO"
          // Read mode from realtime data
          if (data.Mode || data.mode) {
            mode = (data.Mode || data.mode).toString().toUpperCase()
          }
          // Keep realtime value for ON/OFF
        }

        // Read IoT status from Firebase (type-based mapping, then fallback to status_<key>)
        const typeStatusMap = { 'temperature': 'status_temp', 'ph': 'status_ph', 'do': 'status_do' }
        const statusField = typeStatusMap[type] || `status_${keyLower}`
        const iotStatus = data[statusField] ?? null
        
        sensors[type] = {
          key: key,
          label: label,
          value: value,
          unit: unit,
          type: type,
          timestamp: data.timestamp,
          mode: mode,
          iotStatus: iotStatus
        }
      })
    }
    
    callback(sensors)
  }, (error) => {
    console.error("Error subscribing to sensors:", error)
    if (error.message?.includes("index")) {
      console.error("(ERROR) Firebase Index Required!")
    }
    callback({})
  })

  return () => {
    unsubRealtime()
    unsubPond()
    unsubSettings()
  }
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

  let currentConfigSensors = []
  let currentConfigActuators = []

  // Step 1: Subscribe to Pond configuration
  const unsubPond = onSnapshot(doc(db, "ponds", pondId), (pondSnap) => {
    if (pondSnap.exists()) {
      currentConfigSensors = pondSnap.data().sensors || []
      currentConfigActuators = pondSnap.data().actuators || []
    } else {
      currentConfigSensors = []
      currentConfigActuators = []
    }
  })

  // Step 2: Path to realtime collection
  const collectionRef = collection(db, "ponds", pondId, "realtime")
  
  // Get last 30 records
  const q = query(
    collectionRef, 
    orderBy("timestamp", "desc"),
    limit(30)
  )
  
  const unsubRealtime = onSnapshot(q, (snapshot) => {
    debugLog("Historical data snapshot received:", snapshot.docs.length, "documents")
    
    if (snapshot.empty) {
      debugLog("No historical data found")
      callback([])
      return
    }
    
    // Map documents to historical data format dynamically
    const history = snapshot.docs.map(doc => {
      const data = doc.data()
      
      let date = new Date()
      if (data.timestamp) {
        if (typeof data.timestamp === 'string' || typeof data.timestamp === 'number') {
          date = new Date(parseInt(data.timestamp))
        } else if (data.timestamp.toDate) {
          date = data.timestamp.toDate()
        }
      }
      
      const record = {
        id: doc.id,
        date: date,
        aiRisk: "Aman",
        dynamicData: {} 
      }
      
      // SCENARIO A: Admin has configured custom sensors
      if (currentConfigSensors.length > 0 || currentConfigActuators.length > 0) {
        currentConfigSensors.forEach(config => {
          let value = data[config.key] ?? "-"
          
          if (config.type === 'heater' || config.type === 'actuator') {
            if (value === true || value === "tum") value = 1
            else if (value === false) value = 0
            else value = value === "ON" ? 1 : 0
          }

          // Use configured key for charts to attach to
          record[config.key] = value
          
          // Save for table rendering utilizing the label if preferred, or key
          record.dynamicData[config.label || config.key] = value

          // Store per-point IoT status for chart coloring
          // Try status_<key> first, then type-based mapping
          const keyLower = config.key.toLowerCase()
          let pointStatus = data[`status_${keyLower}`]
          if (pointStatus === undefined || pointStatus === null) {
            const typeStatusMap = { 'temperature': 'status_temp', 'ph': 'status_ph', 'do': 'status_do' }
            const statusField = typeStatusMap[config.type]
            if (statusField) pointStatus = data[statusField]
          }
          record[`${config.key}_status`] = pointStatus ?? null
        })

        // Also process configured actuators
        currentConfigActuators.forEach(config => {
          let value = data[config.key] ?? "-"
          if (value === true || value === "tum") value = 1
          else if (value === false) value = 0
          else if (value === "ON") value = 1
          else if (value === "OFF") value = 0

          record[config.key] = value
          record.dynamicData[config.label || config.key] = value
        })
      } 
      // SCENARIO B: No configuration, fallback dynamic parsing
      else {
        Object.keys(data).forEach(key => {
          // Skip metadata and IoT status fields
          if (key === 'timestamp' || key === 'userId' || key === 'kolamId' || key.startsWith('status_')) return;
          
          const keyLower = key.toLowerCase()
          let type = 'generic'
          let value = data[key] ?? "-"
          
          if (keyLower.includes('suhu') || keyLower.includes('temp')) type = 'temperature'
          else if (keyLower.includes('ph')) type = 'ph'
          else if (keyLower.includes('do') || keyLower.includes('oksigen')) type = 'do'
          else if (keyLower.includes('aktuator') || keyLower.includes('heater')) {
            type = 'heater'
            if (value === true || value === "tum") value = 1
            else if (value === false) value = 0
            else value = value === "ON" ? 1 : 0
          }
          
          record[type] = value
          record.dynamicData[key] = value

          // Store per-point IoT status for chart coloring
          const typeStatusMap = { 'temperature': 'status_temp', 'ph': 'status_ph', 'do': 'status_do' }
          const statusField = typeStatusMap[type] || `status_${keyLower}`
          record[`${key}_status`] = data[statusField] ?? null
        })
      }
      
      return record
    })
    
    // Sort by date descending
    history.sort((a, b) => b.date.getTime() - a.date.getTime())
    
    debugLog("Historical data processed:", history.length, "records")
    callback(history)
  }, (error) => {
    console.error("Error subscribing to historical data:", error)
    if (error.message?.includes("index")) {
      console.error("(ERROR) Firebase Index Required!")
    }
    callback([])
  })

  return () => {
    unsubRealtime()
    unsubPond()
  }
}

/**
 * Subscribe to the latest AI prediction for a specific pond
 * Documents are named with Unix timestamps, so ordering by __name__ desc gives the latest
 * @param {string} pondId - ID of the pond
 * @param {function} callback - Function to call with the latest AI prediction data
 * @returns {function} - Unsubscribe function
 */
export const subscribeToAiPrediction = (pondId, callback) => {
  if (!pondId) return () => {}

  const collectionRef = collection(db, "ponds", pondId, "ai")
  const q = query(
    collectionRef,
    orderBy("__name__", "desc"),
    limit(1)
  )

  const unsubscribe = onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      debugLog("No AI prediction documents found")
      callback(null)
      return
    }

    const doc = snapshot.docs[0]
    const data = doc.data()

    // Convert document ID (Unix timestamp) to readable date
    const timestamp = parseInt(doc.id)
    const date = isNaN(timestamp) ? new Date() : new Date(timestamp)

    callback({
      id: doc.id,
      date,
      heater_status: data.heater_status || null,
      predicted_do_30min: data.predicted_do_30min ?? null,
      predicted_ph_30min: data.predicted_ph_30min ?? null,
      predicted_temperature_30min: data.predicted_temperature_30min ?? null,
      recommendations: data.recommendations || [],
      risk_status: data.risk_status || null,
      temperature_status: data.temperature_status || null,
    })
  }, (error) => {
    console.error("Error subscribing to AI predictions:", error)
    callback(null)
  })

  return unsubscribe
}
