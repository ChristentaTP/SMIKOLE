import MainLayout from "../layout/MainLayout"
import SensorCard from "../../components/cards/SensorCard"

export default function Dashboard() {
  return (
    <MainLayout>
      {/* Wrapper biar aman dari bottom nav */}
      <div className="pb-20 md:pb-0">

        {/* SENSOR CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SensorCard title="Suhu Air" value="20" unit="°C" color="bg-yellow-400" />
          <SensorCard title="pH Air" value="5.5" unit="" color="bg-yellow-300" />
          <SensorCard title="Dissolved Oxygen" value="12.8" unit="ppm" color="bg-green-500" />

          <div className="bg-white rounded-lg p-4 shadow">
            <p className="text-sm text-gray-500">Water Heater</p>
            <p className="font-semibold mt-2">Menyala (Otomatis)</p>
          </div>
        </div>

        {/* AI RECOMMENDATION */}
        <div className="bg-white rounded-lg p-4 shadow mb-6">
          <p className="font-semibold mb-2">Rekomendasi AI</p>
          <p className="text-gray-700">
            Naikkan suhu kolam <span className="font-semibold">26°C</span>
          </p>
        </div>

        {/* MONITORING TABLE */}
        <div className="bg-white rounded-lg p-4 shadow overflow-x-auto">
          <p className="font-semibold mb-4">Riwayat Monitoring</p>

          <table className="w-full text-sm min-w-[640px]">
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

      </div>
    </MainLayout>
  )
}
