import { useState, useEffect } from "react"
import { doc, onSnapshot, updateDoc, collection, query, orderBy, limit } from "firebase/firestore"
import { db } from "../../services/firebase"
import MainLayout from "../layout/MainLayout"
import ActuatorCard from "../../components/cards/ActuatorCard"

export default function KontrolAktuator() {
  const [selectedPondId, setSelectedPondId] = useState(() => {
    return sessionStorage.getItem("smikole-selected-pond") || null
  })
  
  const [actuators, setActuators] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // 1. Resolve selectedPondId if empty
  useEffect(() => {
    if (selectedPondId) return;
    
    import("firebase/firestore").then(({ collection, getDocs }) => {
      getDocs(collection(db, "ponds")).then(snapshot => {
        if (!snapshot.empty) {
          const firstId = snapshot.docs[0].id
          setSelectedPondId(firstId)
          sessionStorage.setItem("smikole-selected-pond", firstId)
        }
      })
    })
  }, [selectedPondId])

  // 2. Listen to data streams (Pond Config, Settings, Realtime)
  useEffect(() => {
    if (!selectedPondId) return;

    let configActuators = []
    let settingsData = {}
    let realtimeData = {}
    let hasActuatorsConfig = false // tracks if pond doc has 'actuators' field at all

    // Helper to merge all 3 data sources into the final actuators array
    const mergeData = () => {
      // If the pond document has an 'actuators' field (even empty), respect it
      if (hasActuatorsConfig) {
        if (configActuators.length === 0) {
          // Admin intentionally removed all actuators → show empty state
          setActuators([])
          setIsLoading(false)
          return
        }

        // Map configured actuators
        const mapped = configActuators.map(act => {
          const actSettings = settingsData[act.key] || {}
          const isLegacyHeater = act.key.toLowerCase().includes('heater') || act.key.toLowerCase().includes('aktuator')
          let mode = "otomatis"
          let manualState = false
          
          if (actSettings.mode) {
            mode = actSettings.mode === "MANUAL" ? "manual" : "otomatis"
            manualState = actSettings.state || false
          } else if (isLegacyHeater && settingsData.mode) {
            mode = settingsData.mode === "MANUAL" ? "manual" : "otomatis"
            manualState = settingsData.manualState || false
          }

          let isActive = false
          if (mode === "manual") {
            isActive = manualState
          } else {
            const val = realtimeData[act.key]
            isActive = val === true || val === "tum" || val === "on" || val === 1 || val === "1"
          }

          return {
            id: act.key,
            name: act.label || act.key,
            mode,
            isActive
          }
        })

        setActuators(mapped)
        setIsLoading(false)
        return
      }

      // Legacy fallback: pond has no 'actuators' field at all (old structure)
      const fallbackActuator = {
        id: "Aktuator",
        name: "Water Heater",
        mode: settingsData.mode === "MANUAL" ? "manual" : "otomatis",
        isActive: false
      }
      
      if (fallbackActuator.mode === "manual") {
        fallbackActuator.isActive = settingsData.manualState || false
      } else {
        fallbackActuator.isActive = realtimeData.Aktuator === true || realtimeData.Aktuator === "tum"
      }
      setActuators([fallbackActuator])
      setIsLoading(false)
    }

    setIsLoading(true)

    // A. Subscribe to Pond config
    const unsubPond = onSnapshot(doc(db, "ponds", selectedPondId), (docSnap) => {
      if (docSnap.exists()) {
        const pondData = docSnap.data()
        hasActuatorsConfig = pondData.hasOwnProperty('actuators')
        configActuators = pondData.actuators || []
        mergeData()
      }
    })

    // B. Subscribe to Control Settings
    const unsubSettings = onSnapshot(doc(db, "ponds", selectedPondId, "control", "settings"), (docSnap) => {
      if (docSnap.exists()) {
        settingsData = docSnap.data()
        mergeData()
      }
    })

    // C. Subscribe to Realtime Data
    const qRealtime = query(
      collection(db, "ponds", selectedPondId, "realtime"),
      orderBy("timestamp", "desc"),
      limit(1)
    )
    const unsubRealtime = onSnapshot(qRealtime, (snapshot) => {
      if (!snapshot.empty) {
        realtimeData = snapshot.docs[0].data()
        mergeData()
      }
    })

    return () => {
      unsubPond()
      unsubSettings()
      unsubRealtime()
    }
  }, [selectedPondId])

  // Handler untuk perubahan mode/status
  const handleModeChange = async (actKey, statusData) => {
    if (!selectedPondId) return;
    try {
      const isManual = statusData.mode === "manual"
      
      const docRef = doc(db, "ponds", selectedPondId, "control", "settings")
      
      // We update the specific actuator key inside settings, but also keep legacy fields updated
      // just in case IoT is strictly reading legacy root fields for now.
      const isLegacyHeater = actKey.toLowerCase().includes('heater') || actKey.toLowerCase().includes('aktuator')
      
      const updateData = {
        [`${actKey}.mode`]: isManual ? "MANUAL" : "AUTO"
      }
      
      if (isManual && statusData.powerState !== null) {
        updateData[`${actKey}.state`] = statusData.powerState
      }

      // Legacy fallback mapping
      if (isLegacyHeater) {
        updateData.mode = isManual ? "MANUAL" : "AUTO"
        if (isManual && statusData.powerState !== null) {
          updateData.manualState = statusData.powerState
        }
      }
      
      await updateDoc(docRef, updateData)
    } catch (error) {
      console.error("Gagal update aktuator:", error)
      alert("Gagal mengupdate pengaturan aktuator.")
    }
  }

  return (
    <MainLayout>
      <div className="pb-20 md:pb-0">
        <h1 className="text-2xl font-bold mb-6 dark:text-white">
          Kontrol Aktuator {selectedPondId ? `(${selectedPondId})` : ""}
        </h1>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#085C85]"></div>
          </div>
        ) : actuators.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl text-center border border-dashed border-gray-300 dark:border-gray-700 text-gray-500">
            Belum ada aktuator yang dikonfigurasi untuk kolam ini. 
            <br/><span className="text-sm mt-2 block">Coba tambahkan via menu Manajemen Kolam (Admin).</span>
          </div>
        ) : (
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
        )}
      </div>
    </MainLayout>
  )
}
