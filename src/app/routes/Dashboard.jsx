import MainLayout from "../layout/MainLayout"
import SensorCard from "../../components/cards/SensorCard"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faThermometerHalf, faWater, faDroplet, faBrain, faFire } from "@fortawesome/free-solid-svg-icons"
import { Link } from "react-router-dom"

import { useState, useEffect, useMemo } from "react"
import { subscribeToPonds, subscribeToSensors, subscribeToHistoricalData } from "../../services/dashboardService"
import SensorChartModal from "../../components/modals/SensorChartModal"
import { 
  useReactTable, 
  getCoreRowModel, 
  getPaginationRowModel, 
  getSortedRowModel,
  flexRender 
} from "@tanstack/react-table"
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts"

// Helper to format date with time (stable - outside component)
const formatDate = (date) => {
  if (!date) return "-"
  const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' }
  const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }
  const dateStr = new Date(date).toLocaleDateString('id-ID', dateOptions)
  const timeStr = new Date(date).toLocaleTimeString('id-ID', timeOptions)
  return `${dateStr} ${timeStr}`
}

export default function Dashboard() {
  const [sensorData, setSensorData] = useState({})
  const [ponds, setPonds] = useState([])
  const [selectedPondId, setSelectedPondId] = useState(() => {
    return sessionStorage.getItem("smikole-selected-pond") || null
  })
  const [historicalData, setHistoricalData] = useState([])
  const [sorting, setSorting] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSensor, setSelectedSensor] = useState(null)

  // Subscribe to Ponds on mount (runs once)
  useEffect(() => {
    const unsubscribe = subscribeToPonds((data) => {
      setPonds(data)
      setSelectedPondId(prev => {
        if (!prev && data.length > 0) {
          sessionStorage.setItem("smikole-selected-pond", data[0].id)
          return data[0].id
        }
        return prev
      })
    })
    return () => unsubscribe()
  }, [])

  // Cache pond selection
  useEffect(() => {
    if (selectedPondId) sessionStorage.setItem("smikole-selected-pond", selectedPondId)
  }, [selectedPondId])

  // Subscribe to Sensors when pond is ready
  useEffect(() => {
    if (!selectedPondId) return
    setIsLoading(true)
    const unsubscribe = subscribeToSensors(selectedPondId, (data) => {
      setSensorData(data)
      setIsLoading(false)
    })
    return () => unsubscribe()
  }, [selectedPondId])

  // Subscribe to Historical Data when pond is ready
  useEffect(() => {
    if (!selectedPondId) return
    const unsubscribe = subscribeToHistoricalData(selectedPondId, (data) => {
      setHistoricalData(data)
    })
    return () => unsubscribe()
  }, [selectedPondId])

  // Helper to safely get value or default
  const getSensorValue = (type, defaultVal = "-") => {
    return sensorData[type]?.value ?? defaultVal
  }



  // TanStack Table column definitions
  const columns = useMemo(
    () => [
      {
        accessorKey: 'date',
        header: 'Tanggal',
        cell: info => formatDate(info.getValue()),
      },
      {
        accessorKey: 'temperature',
        header: 'Suhu',
        cell: info => `${info.getValue() ?? '-'}°C`,
      },
      {
        accessorKey: 'ph',
        header: 'pH',
        cell: info => info.getValue() ?? '-',
      },
      {
        accessorKey: 'do',
        header: 'DO',
        cell: info => `${info.getValue() ?? '-'} ppm`,
      },
      {
        accessorKey: 'heater',
        header: 'Heater',
        cell: info => info.getValue() ?? '-',
      },
      {
        accessorKey: 'aiRisk',
        header: 'Risiko AI',
        cell: info => (
          <span className="text-green-600 dark:text-green-400 font-medium">{info.getValue() ?? 'Aman'}</span>
        ),
      },
    ],
    []
  )

  // TanStack Table instance
  const table = useReactTable({
    data: historicalData,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  // Threshold-based color logic for sensor cards
  const getSensorStatus = (type, value) => {
    const num = parseFloat(value)
    if (isNaN(num)) return { status: "-", statusColor: "bg-gray-300 text-gray-700", cardColor: "bg-white dark:bg-gray-800 text-black dark:text-white border dark:border-gray-700" }

    switch (type) {
      case "temperature":
        if (num >= 26 && num <= 32) return { status: "Aman", statusColor: "bg-green-500 text-white", cardColor: "bg-green-100 dark:bg-green-900/40 text-black dark:text-white" }
        if ((num >= 24 && num < 26) || (num > 32 && num <= 34)) return { status: "Waspada", statusColor: "bg-yellow-400 text-black", cardColor: "bg-yellow-100 dark:bg-yellow-900/40 text-black dark:text-white" }
        return { status: "Bahaya", statusColor: "bg-red-500 text-white", cardColor: "bg-red-100 dark:bg-red-900/40 text-black dark:text-white" }

      case "ph":
        if (num >= 6.5 && num <= 8.5) return { status: "Aman", statusColor: "bg-green-500 text-white", cardColor: "bg-green-100 dark:bg-green-900/40 text-black dark:text-white" }
        if ((num >= 6.0 && num < 6.5) || (num > 8.5 && num <= 9.0)) return { status: "Waspada", statusColor: "bg-yellow-400 text-black", cardColor: "bg-yellow-100 dark:bg-yellow-900/40 text-black dark:text-white" }
        return { status: "Bahaya", statusColor: "bg-red-500 text-white", cardColor: "bg-red-100 dark:bg-red-900/40 text-black dark:text-white" }

      case "do":
        if (num >= 5) return { status: "Aman", statusColor: "bg-green-500 text-white", cardColor: "bg-green-100 dark:bg-green-900/40 text-black dark:text-white" }
        if (num >= 4 && num < 5) return { status: "Waspada", statusColor: "bg-yellow-400 text-black", cardColor: "bg-yellow-100 dark:bg-yellow-900/40 text-black dark:text-white" }
        return { status: "Bahaya", statusColor: "bg-red-500 text-white", cardColor: "bg-red-100 dark:bg-red-900/40 text-black dark:text-white" }

      default:
        return { status: "-", statusColor: "bg-gray-300 text-gray-700", cardColor: "bg-white dark:bg-gray-800 text-black dark:text-white border dark:border-gray-700" }
    }
  }

  const tempStatus = getSensorStatus("temperature", getSensorValue("temperature"))
  const phStatus = getSensorStatus("ph", getSensorValue("ph"))
  const doStatus = getSensorStatus("do", getSensorValue("do"))

  return (
    <>
    <MainLayout>
      {/* Wrapper  bottom nav */}
      <div className="pb-32 md:pb-0">

        {/* Loading overlay */}
        {isLoading && (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#085C85]"></div>
          </div>
        )}

        {!isLoading && <>
        {/* SENSOR CARDS - Row 1 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <SensorCard 
            title="Suhu Air" 
            value={getSensorValue("temperature", "-")} 
            unit="°C" 
            color={tempStatus.cardColor}
            icon={faThermometerHalf}
            status={tempStatus.status}
            statusColor={tempStatus.statusColor}
            onClick={() => setSelectedSensor("temperature")}
          />
          <SensorCard 
            title="pH Air" 
            value={getSensorValue("ph", "-")} 
            unit="" 
            color={phStatus.cardColor}
            icon={faWater}
            status={phStatus.status}
            statusColor={phStatus.statusColor}
            onClick={() => setSelectedSensor("ph")}
          />
        </div>

        {/* SENSOR CARDS - Row 2 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <SensorCard 
            title="Oksigen Terlarut" 
            value={getSensorValue("do", "-")} 
            unit="ppm" 
            color={doStatus.cardColor}
            icon={faDroplet}
            status={doStatus.status}
            statusColor={doStatus.statusColor}
            onClick={() => setSelectedSensor("do")}
          />
          <SensorCard 
            title="Water Heater" 
            value={getSensorValue("Heater", "Unknown")} 
            unit="" 
            color="bg-white dark:bg-gray-800 text-black dark:text-white border dark:border-gray-700" 
            icon={faFire}
          />
        </div>
        
        {/* AI RECOMMENDATION */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md border dark:border-gray-700 mb-6">
          <div className="flex justify-between items-start mb-2">
            <p className="text-lg font-bold dark:text-white">Rekomendasi AI</p>
            <FontAwesomeIcon icon={faBrain} className="text-xl text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-4">-</p>
          <div className="flex justify-end">
            <Link 
              to="/prediksi-fcr" 
              className="bg-[#085C85] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#064a6a] transition-colors"
            >
              Selanjutnya
            </Link>
          </div>
        </div>

        {/* MONITORING GRAPH */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md border dark:border-gray-700 mb-6">
          <p className="text-lg font-bold mb-4 dark:text-white">Grafik Monitoring Sensor</p>
          
          {historicalData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={historicalData}
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => {
                    const d = new Date(date)
                    const hours = String(d.getHours()).padStart(2, '0')
                    const minutes = String(d.getMinutes()).padStart(2, '0')
                    const seconds = String(d.getSeconds()).padStart(2, '0')
                    return `${hours}:${minutes}:${seconds}`
                  }}
                  fontSize={12}
                />
                <YAxis fontSize={12} />
                <Tooltip 
                  labelFormatter={(date) => formatDate(date)}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    padding: '10px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="temperature" 
                  stroke="#F0DF22" 
                  strokeWidth={2}
                  name="Suhu (°C)"
                  dot={{ fill: '#F0DF22' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="ph" 
                  stroke="#085C85" 
                  strokeWidth={2}
                  name="pH"
                  dot={{ fill: '#085C85' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="do" 
                  stroke="#72BB53" 
                  strokeWidth={2}
                  name="DO (ppm)"
                  dot={{ fill: '#72BB53' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              Tidak ada data untuk ditampilkan
            </div>
          )}
        </div>

        {/* MONITORING TABLE */}
        <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 shadow-md dark:border dark:border-gray-700">
          <p className="font-semibold mb-4 dark:text-white">Riwayat Monitoring</p>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="text-left text-gray-500 dark:text-gray-400">
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        className="py-2 cursor-pointer select-none hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-1">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {/* Sorting indicator */}
                          {{
                            asc: ' 🔼',
                            desc: ' 🔽',
                          }[header.column.getIsSorted()] ?? null}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="py-2 dark:text-gray-300">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr className="border-t dark:border-gray-700">
                    <td colSpan={columns.length} className="py-4 text-center text-gray-500 dark:text-gray-400">
                      Tidak ada data monitoring
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => {
                const record = row.original
                return (
                  <div key={row.id} className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm border dark:border-gray-600">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium dark:text-white">{formatDate(record.date)}</span>
                      <span className="text-green-600 dark:text-green-400 text-xs font-medium bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">{record.aiRisk}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm dark:text-gray-300">
                      <div><span className="text-gray-500 dark:text-gray-400">Suhu:</span> {record.temperature}°C</div>
                      <div><span className="text-gray-500 dark:text-gray-400">pH:</span> {record.ph}</div>
                      <div><span className="text-gray-500 dark:text-gray-400">DO:</span> {record.do} ppm</div>
                      <div><span className="text-gray-500 dark:text-gray-400">Heater:</span> {record.heater}</div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="bg-white dark:bg-gray-700 rounded-lg p-4 text-center text-gray-500 dark:text-gray-400">
                Tidak ada data monitoring
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {table.getPageCount() > 1 && (
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  !table.getCanPreviousPage()
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-[#085C85] text-white hover:bg-[#064a6a]'
                }`}
              >
                Previous
              </button>
              
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Halaman {table.getState().pagination.pageIndex + 1} dari {table.getPageCount()}
              </span>
              
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  !table.getCanNextPage()
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-[#085C85] text-white hover:bg-[#064a6a]'
                }`}
              >
                Next
              </button>
            </div>
          )}
        </div>

        </>}
      </div>
    </MainLayout>

    {/* Sensor Chart Modal */}
    <SensorChartModal
      isOpen={!!selectedSensor}
      onClose={() => setSelectedSensor(null)}
      sensorType={selectedSensor}
      historicalData={historicalData}
    />
    </>
  )
}
