import { useState } from "react"
import MainLayout from "../layout/MainLayout"
import ActuatorCard from "../../components/cards/ActuatorCard"

export default function KontrolAktuator() {
  // State untuk setiap aktuator
  const [actuators, setActuators] = useState([
    { id: 1, name: "Water Heater", isActive: false },
  ])

  // Handler untuk toggle aktuator
  const handleToggle = (id, newState) => {
    setActuators((prev) =>
      prev.map((actuator) =>
        actuator.id === id ? { ...actuator, isActive: newState } : actuator
      )
    )
  }

  return (
    <MainLayout>
      <div className="pb-20 md:pb-0">
        <h1 className="text-2xl font-bold mb-6">Kontrol Aktuator</h1>
        
        {/* Actuator Cards */}
        <div className="space-y-4">
          {actuators.map((actuator) => (
            <ActuatorCard
              key={actuator.id}
              name={actuator.name}
              isActive={actuator.isActive}
              onToggle={(newState) => handleToggle(actuator.id, newState)}
            />
          ))}
        </div>
      </div>
    </MainLayout>
  )
}
