import MainLayout from "../layout/MainLayout"
import SensorCard from "../../components/cards/SensorCard"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faThermometerHalf, faWater, faDroplet, faBrain, faFire } from "@fortawesome/free-solid-svg-icons"
import { Link } from "react-router-dom"

import { useState, useEffect } from "react"
import { subscribeToPonds, subscribeToSensors } from "../../services/dashboardService"

export default function Dashboard() {
  const [sensorData, setSensorData] = useState({})
  const [ponds, setPonds] = useState([])
  const [selectedPondId, setSelectedPondId] = useState(null)

  // Subscribe to Ponds on mount
  useEffect(() => {
    const unsubscribe = subscribeToPonds((data) => {
      setPonds(data)
      // Select first pond by default if none selected
      if (data.length > 0 && !selectedPondId) {
        setSelectedPondId(data[0].id)
      }
    })
    return () => unsubscribe()
  }, [selectedPondId])

  // Subscribe to Sensors when pond changes
  useEffect(() => {
    const unsubscribe = subscribeToSensors(selectedPondId, (data) => {
      setSensorData(data)
    })
    return () => unsubscribe()
  }, [selectedPondId])

  // Helper to safely get value or default
  const getSensorValue = (type, defaultVal = "-") => {
    return sensorData[type]?.value ?? defaultVal
  }

  return (
    <MainLayout>
      {/* Wrapper biar aman dari bottom nav */}
      <div className="pb-20 md:pb-0">

        {/* SENSOR CARDS - Row 1 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <SensorCard 
            title="Suhu Air" 
            value={getSensorValue("temperature", "-")} 
            unit="°C" 
            color="bg-[#F0DF22] text-black" 
            icon={faThermometerHalf}
            status="Normal"
            statusColor="bg-[#72BB53] text-black"
          />
          <SensorCard 
            title="pH Air" 
            value={getSensorValue("ph", "-")} 
            unit="" 
            color="bg-[#F0DF22] text-black"  
            icon={faWater}
            status="Normal"
            statusColor="bg-[#72BB53] text-black"
          />
        </div>

        {/* SENSOR CARDS - Row 2 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <SensorCard 
            title="Oksigen Terlarut" 
            value={getSensorValue("do", "-")} 
            unit="ppm" 
            color="bg-[#72BB53] text-black"
            icon={faDroplet}
            status="Normal"
            statusColor="bg-[#72BB53] text-black"
          />
          <SensorCard 
            title="Water Heater" 
            value={getSensorValue("Heater", "Unknown")} 
            unit="" 
            color="bg-white text-black border" 
            icon={faFire}
          />
        </div>
        
        {/* AI RECOMMENDATION */}
        <div className="bg-white rounded-xl p-4 shadow-md border mb-6">
          <div className="flex justify-between items-start mb-2">
            <p className="text-lg font-bold">Rekomendasi AI</p>
            <FontAwesomeIcon icon={faBrain} className="text-xl text-gray-400" />
          </div>
          <p className="text-gray-700 mb-4">-</p>
          <div className="flex justify-end">
            <Link 
              to="/prediksi-fcr" 
              className="bg-[#085C85] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#064a6a] transition-colors"
            >
              Selanjutnya
            </Link>
          </div>
        </div>

        {/* MONITORING TABLE */}
        <div className="bg-gray-100 rounded-xl p-4 shadow-md">
          <p className="font-semibold mb-4">Riwayat Monitoring</p>

          {/* Desktop Table */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2">Tanggal</th>
                  <th>Suhu</th>
                  <th>pH</th>
                  <th>DO</th>
                  <th>Heater</th>
                  <th>Risiko AI</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="py-2">29 Oktober 2025</td>
                  <td>29°C</td>
                  <td>7.1</td>
                  <td>6.2 ppm</td>
                  <td>OFF</td>
                  <td className="text-green-600 font-medium">Aman</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            <div className="bg-white rounded-lg p-3 shadow-sm border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">29 Oktober 2025</span>
                <span className="text-green-600 text-xs font-medium bg-green-100 px-2 py-1 rounded">Aman</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">Suhu:</span> 29°C</div>
                <div><span className="text-gray-500">pH:</span> 7.1</div>
                <div><span className="text-gray-500">DO:</span> 6.2 ppm</div>
                <div><span className="text-gray-500">Heater:</span> OFF</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </MainLayout>
  )
}
