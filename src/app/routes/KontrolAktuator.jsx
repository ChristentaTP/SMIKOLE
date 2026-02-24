import { useState, useEffect } from "react"
import { doc, onSnapshot, updateDoc } from "firebase/firestore"
import { db } from "../../services/firebase"
import MainLayout from "../layout/MainLayout"
import ActuatorCard from "../../components/cards/ActuatorCard"

export default function KontrolAktuator() {
  const [actuators, setActuators] = useState([
    { id: "kolam1_heater", name: "Water Heater", isActive: false, mode: "otomatis" },
  ])

  // Listen to Firebase Realtime Settings
  useEffect(() => {
    // Listen to settings for manual mode and manual power state
    const unsubSettings = onSnapshot(doc(db, "ponds", "kolam1", "control", "settings"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data()
        setActuators(prev => {
          const newActuators = [...prev]
          newActuators[0] = {
            ...newActuators[0],
            manualState: data.manualState || false,
            mode: data.mode === "MANUAL" ? "manual" : "otomatis"
          }
          
          // If in manual mode, the active state IS the manual state
          if (newActuators[0].mode === "manual") {
            newActuators[0].isActive = newActuators[0].manualState
          }
          
          return newActuators
        })
      }
    })

    // Listen to realtime data for auto mode power state
    import("firebase/firestore").then(({ collection, query, orderBy, limit, onSnapshot }) => {
      const q = query(
        collection(db, "ponds", "kolam1", "realtime"),
        orderBy("timestamp", "desc"),
        limit(1)
      )
      
      const unsubRealtime = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const latestDoc = snapshot.docs[0].data()
          setActuators(prev => {
            const newActuators = [...prev]
            // If in auto mode, the active state is the realtime state
            if (newActuators[0].mode === "otomatis") {
              const isHeaterActive = latestDoc.Aktuator === true || latestDoc.Aktuator === "tum"
              newActuators[0].isActive = isHeaterActive
            }
            return newActuators
          })
        }
      })
      
      // We attach the realtime unsub to the main component unmount
      return () => {
        unsubSettings()
        unsubRealtime()
      }
    })

    return () => unsubSettings() // Fallback if import is slow
  }, [])

  // Handler untuk perubahan mode/status dari modal
  const handleModeChange = async (id, statusData) => {
    try {
      const isManual = statusData.mode === "manual"
      const updateData = {
        mode: isManual ? "MANUAL" : "AUTO",
      }
      if (isManual && statusData.powerState !== null) {
        updateData.manualState = statusData.powerState
      }
      
      const docRef = doc(db, "ponds", "kolam1", "control", "settings")
      await updateDoc(docRef, updateData)
    } catch (error) {
      console.error("Gagal update aktuator:", error)
    }
  }

  return (
    <MainLayout>
      <div className="pb-20 md:pb-0">
        <h1 className="text-2xl font-bold mb-6 dark:text-white">Kontrol Aktuator</h1>
        
        {/* Actuator Cards */}
        <div className="space-y-4">
          {actuators.map((actuator) => (
            <ActuatorCard
              key={actuator.id}
              name={actuator.name}
              isActive={actuator.isActive}
              mode={actuator.mode}
              onModeChange={(statusData) => handleModeChange(actuator.id, statusData)}
            />
          ))}
        </div>
      </div>
    </MainLayout>
  )
}
