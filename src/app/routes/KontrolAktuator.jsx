import { useState, useEffect } from "react"
import { doc, onSnapshot, updateDoc } from "firebase/firestore"
import { db } from "../../services/firebase"
import MainLayout from "../layout/MainLayout"
import ActuatorCard from "../../components/cards/ActuatorCard"

export default function KontrolAktuator() {
  const [actuators, setActuators] = useState([
    { id: "kolam1_heater", name: "Water Heater", isActive: false, mode: "otomatis" },
  ])

  // Listen to Firebase Realtime
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "ponds", "kolam1", "control", "settings"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data()
        setActuators([
          {
            id: "kolam1_heater",
            name: "Water Heater",
            isActive: data.manualState || false,
            mode: data.mode === "MANUAL" ? "manual" : "otomatis"
          }
        ])
      }
    })
    return () => unsub()
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
