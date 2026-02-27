import MainLayout from "../layout/MainLayout"
import SensorCard from "../../components/cards/SensorCard"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faThermometerHalf, faWater, faDroplet, faBrain, faFire } from "@fortawesome/free-solid-svg-icons"
import { Link } from "react-router-dom"

import { useState, useEffect, useMemo } from "react"
import { subscribeToPonds, subscribeToSensors, subscribeToHistoricalData } from "../../services/dashboardService"
import { useAuth } from "../../contexts/AuthContext"
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
  const { user, userData } = useAuth()
  const [sensorData, setSensorData] = useState({})
  const [ponds, setPonds] = useState([])
  const [selectedPondId, setSelectedPondId] = useState(() => {
    return sessionStorage.getItem("smikole-selected-pond") || null
  })
  const [historicalData, setHistoricalData] = useState([])
  const [sorting, setSorting] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSensor, setSelectedSensor] = useState(null)

  // Subscribe to Ponds on mount (filtered by user role)
  useEffect(() => {
    if (!user || !userData) return
    const unsubscribe = subscribeToPonds((data) => {
      setPonds(data)
      setSelectedPondId(prev => {
        // If we have a selected pond but it's no longer in the allowed list
        if (prev && !data.find(p => p.id === prev)) {
          if (data.length > 0) {
            sessionStorage.setItem("smikole-selected-pond", data[0].id)
            return data[0].id
          } else {
            sessionStorage.removeItem("smikole-selected-pond")
            return null
          }
        }
        
        // If we don't have a selected pond yet, pick the first one
        if (!prev && data.length > 0) {
          sessionStorage.setItem("smikole-selected-pond", data[0].id)
          return data[0].id
        }
        
        return prev
      })
    }, user.uid, userData.role)
    return () => unsubscribe()
  }, [user, userData])

  // Cache pond selection
  useEffect(() => {
    if (selectedPondId) sessionStorage.setItem("smikole-selected-pond", selectedPondId)
  }, [selectedPondId])

  // Subscribe to Sensors when pond is ready
  useEffect(() => {
    if (!selectedPondId) {
      // If we don't have a pond (e.g. user has no assigned ponds), stop loading
      setIsLoading(false)
      return
    }
    
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

  // Chart data sorted ascending (oldest first) so latest readings appear on the right
  const chartData = useMemo(() => {
    return [...historicalData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [historicalData])

  // Helper to safely get value or default
  const getSensorValue = (type, defaultVal = "-") => {
    return sensorData[type]?.value ?? defaultVal
  }

  // TanStack Table column definitions
  const columns = useMemo(() => {
    // Start with the Date column
    const baseCols = [
      {
        accessorKey: 'date',
        header: 'Tanggal',
        cell: info => formatDate(info.getValue()),
      }
    ]
    
    // Extract unique dynamic keys from all historical records to create columns
    const dynamicKeys = new Set()
    historicalData.forEach(row => {
      if (row.dynamicData) {
        Object.keys(row.dynamicData).forEach(key => dynamicKeys.add(key))
      }
    })
    
    // Add dynamic columns
    Array.from(dynamicKeys).forEach(key => {
      baseCols.push({
        accessorFn: row => row.dynamicData ? row.dynamicData[key] : "-",
        id: key,
        header: key.charAt(0).toUpperCase() + key.slice(1),
        cell: info => {
          const val = info.getValue()
          if (val === undefined || val === null) return "-"
          // Helper suffix
          const keyLower = key.toLowerCase()
          if (keyLower.includes('suhu') || keyLower.includes('temp')) return `${val}°C`
          if (keyLower.includes('do') || keyLower.includes('oksigen')) return `${val} ppm`
          return String(val)
        }
      })
    })
    
    // Add AI Risk column at the end
    baseCols.push({
      accessorKey: 'aiRisk',
      header: 'Risiko AI',
      cell: info => (
        <span className="text-green-600 dark:text-green-400 font-medium">{info.getValue() ?? 'Aman'}</span>
      ),
    })

    return baseCols
  }, [historicalData])

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
  const getSensorStatus = (type, value, mode = null, thresholds = null) => {
    if (type === "heater" || type === "actuator") {
      const isOn = value === "ON"
      const isManual = mode === "MANUAL"
      
      return { 
        status: isManual ? "Manual" : "Otomatis", 
        statusColor: isManual ? "bg-red-500 text-white" : "bg-green-500 text-white",
        cardColor: isOn 
          ? "bg-green-100 dark:bg-green-900/40 text-black dark:text-white" 
          : "bg-red-100 dark:bg-red-900/40 text-black dark:text-white"
      }
    }

    const num = parseFloat(value)
    if (isNaN(num)) return { status: "-", statusColor: "bg-gray-300 text-gray-700", cardColor: "bg-white dark:bg-gray-800 text-black dark:text-white border dark:border-gray-700" }

    // Check if we have valid custom thresholds
    const hasThresholds = thresholds && 
      thresholds.amanMin !== "" && thresholds.amanMin !== undefined &&
      thresholds.amanMax !== "" && thresholds.amanMax !== undefined

    if (hasThresholds) {
      const { amanMin, amanMax, waspMin, waspMax } = thresholds
      
      // Aman: between amanMin and amanMax
      if (num >= amanMin && num <= amanMax) {
        return { status: "Aman", statusColor: "bg-green-500 text-white", cardColor: "bg-green-100 dark:bg-green-900/40 text-black dark:text-white" }
      }
      
      // Waspada: between waspMin-amanMin or amanMax-waspMax (if waspada values exist)
      const hasWaspada = waspMin !== "" && waspMin !== undefined && waspMax !== "" && waspMax !== undefined
      if (hasWaspada && ((num >= waspMin && num < amanMin) || (num > amanMax && num <= waspMax))) {
        return { status: "Waspada", statusColor: "bg-yellow-400 text-black", cardColor: "bg-yellow-100 dark:bg-yellow-900/40 text-black dark:text-white" }
      }
      
      // Bahaya: outside all ranges
      return { status: "Bahaya", statusColor: "bg-red-500 text-white", cardColor: "bg-red-100 dark:bg-red-900/40 text-black dark:text-white" }
    }

    // Fallback: no thresholds configured — show neutral "Aktif"
    return { status: "Aktif", statusColor: "bg-[#085C85] text-white", cardColor: "bg-blue-50 dark:bg-blue-900/20 text-black dark:text-white" }
  }

  const getSensorIcon = (type) => {
    switch (type) {
      case "temperature": return faThermometerHalf;
      case "ph": return faWater;
      case "do": return faDroplet;
      case "heater": return faFire;
      default: return faThermometerHalf; // generic fallback
    }
  }

  // Calculate dynamic sensor list for rendering
  const activeSensors = useMemo(() => {
    return Object.entries(sensorData).map(([sensorKey, data]) => {
      // Use the sensor's 'type' property for status/icon, falling back to key-based guessing
      const sensorType = data.type || sensorKey
      const statusObj = getSensorStatus(sensorType, data.value, data.mode, data.thresholds)
      
      // Determine unit formatting: prefer configured unit, then fallback by type
      let unit = data.unit || ""
      if (!unit) {
        if (sensorType === "temperature") unit = "°C"
        else if (sensorType === "do") unit = "ppm"
      }
      
      return {
        type: sensorType,       // For status/icon logic
        key: data.key || sensorKey, // The IoT key used in chart dataKey
        title: data.label || sensorKey,
        value: data.value,
        unit,
        icon: getSensorIcon(sensorType),
        color: statusObj.cardColor,
        status: statusObj.status,
        statusColor: statusObj.statusColor
      }
    })
  }, [sensorData])

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
        {/* Pond Selector */}
        {ponds.length > 1 && (
          <div className="flex items-center gap-3 mb-6 bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border dark:border-gray-700">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Pilih Kolam:</label>
            <select
              value={selectedPondId || ""}
              onChange={(e) => {
                setSelectedPondId(e.target.value)
                sessionStorage.setItem("smikole-selected-pond", e.target.value)
              }}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg text-sm font-semibold dark:text-white focus:ring-2 focus:ring-[#085C85] outline-none"
            >
              {ponds.map(pond => (
                <option key={pond.id} value={pond.id}>
                  {pond.name || pond.id}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* SENSOR CARDS - Dynamic Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {activeSensors.length > 0 ? (
            activeSensors.map((sensor) => (
              <SensorCard 
                key={sensor.key}
                title={sensor.title} 
                value={sensor.value} 
                unit={sensor.unit} 
                color={sensor.color}
                icon={sensor.icon}
                status={sensor.status}
                statusColor={sensor.statusColor}
                onClick={() => setSelectedSensor(sensor.key)}
              />
            ))
          ) : (
            <div className="col-span-full bg-white dark:bg-gray-800 p-6 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-center text-gray-500">
              Belum ada data sensor untuk kolam ini.
            </div>
          )}
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
          
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={chartData}
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
                <YAxis yAxisId="left" fontSize={12} />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  domain={[0, 1]} 
                  ticks={[0, 1]}
                  tickFormatter={(v) => v === 1 ? "ON" : "OFF"}
                  fontSize={12}
                />
                <Tooltip 
                  labelFormatter={(date) => formatDate(date)}
                  formatter={(value, name) => {
                    // If the sensor is an actuator type, show ON/OFF text
                    const sensor = activeSensors.find(s => s.title === name.split(' (')[0] || s.key === name)
                    if (sensor && (sensor.type === 'heater' || sensor.type === 'actuator')) {
                      return [value === 1 ? "ON" : "OFF", name]
                    }
                    return [value, name]
                  }}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    padding: '10px'
                  }}
                />
                <Legend />
                {activeSensors.map((sensor, index) => {
                  const colors = ["#F0DF22", "#085C85", "#72BB53", "#E34A33", "#9C27B0", "#FF9800", "#00BCD4"]
                  const color = colors[index % colors.length]
                  
                  const isActuator = sensor.type === 'heater' || sensor.type === 'actuator'

                  return (
                    <Line 
                      key={sensor.key}
                      type={isActuator ? "stepAfter" : "monotone"}
                      dataKey={sensor.key} 
                      stroke={isActuator ? "#E34A33" : color}
                      strokeWidth={isActuator ? 2 : 2}
                      name={`${sensor.title} ${sensor.unit ? `(${sensor.unit})` : ''}`}
                      dot={isActuator ? false : { fill: color }}
                      yAxisId={isActuator ? "right" : "left"}
                      strokeDasharray={isActuator ? "5 5" : undefined}
                    />
                  )
                })}
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
                      <span className="text-green-600 dark:text-green-400 text-xs font-medium bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">{record.aiRisk ?? 'Aman'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm dark:text-gray-300">
                      {record.dynamicData && Object.entries(record.dynamicData).map(([key, val]) => (
                        <div key={key}>
                          <span className="text-gray-500 dark:text-gray-400 capitalize">{key}:</span> {val}
                        </div>
                      ))}
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
