import MainLayout from "../layout/MainLayout"
import SensorCard from "../../components/cards/SensorCard"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faThermometerHalf, faWater, faDroplet, faBrain, faFire } from "@fortawesome/free-solid-svg-icons"
import { Link } from "react-router-dom"

import { useState, useEffect, useMemo } from "react"
import { subscribeToPonds, subscribeToSensors, subscribeToHistoricalData } from "../../services/dashboardService"
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

export default function Dashboard() {
  const [sensorData, setSensorData] = useState({})
  const [ponds, setPonds] = useState([])
  const [selectedPondId, setSelectedPondId] = useState(null)
  const [historicalData, setHistoricalData] = useState([])
  const [sorting, setSorting] = useState([])

  // Subscribe to Ponds on mount
  useEffect(() => {
    const unsubscribe = subscribeToPonds((data) => {
      console.log("Ponds data received:", data)
      setPonds(data)
      // Select first pond by default if none selected
      if (data.length > 0 && !selectedPondId) {
        console.log("Selecting default pond:", data[0].id)
        setSelectedPondId(data[0].id)
      }
    })
    return () => unsubscribe()
  }, [selectedPondId])

  // Subscribe to Sensors when pond changes
  useEffect(() => {
    console.log("Subscribing to sensors for pond:", selectedPondId)
    const unsubscribe = subscribeToSensors(selectedPondId, (data) => {
      console.log("Sensor data received:", data)
      setSensorData(data)
    })
    return () => unsubscribe()
  }, [selectedPondId])

  // Subscribe to Historical Data when pond changes
  useEffect(() => {
    console.log("Subscribing to historical data for pond:", selectedPondId)
    const unsubscribe = subscribeToHistoricalData(selectedPondId, (data) => {
      console.log("Historical data received:", data)
      setHistoricalData(data)
    })
    return () => unsubscribe()
  }, [selectedPondId])

  // Helper to safely get value or default
  const getSensorValue = (type, defaultVal = "-") => {
    return sensorData[type]?.value ?? defaultVal
  }

  // Helper to format date with time
  const formatDate = (date) => {
    if (!date) return "-"
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' }
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }
    const dateStr = new Date(date).toLocaleDateString('id-ID', dateOptions)
    const timeStr = new Date(date).toLocaleTimeString('id-ID', timeOptions)
    return `${dateStr} ${timeStr}`
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
          <span className="text-green-600 font-medium">{info.getValue() ?? 'Aman'}</span>
        ),
      },
    ],
    [formatDate]
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

  return (
    <MainLayout>
      {/* Wrapper biar aman dari bottom nav */}
      <div className="pb-32 md:pb-0">

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

        {/* MONITORING GRAPH */}
        <div className="bg-white rounded-xl p-4 shadow-md border mb-6">
          <p className="text-lg font-bold mb-4">Grafik Monitoring Sensor</p>
          
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
            <div className="text-center text-gray-500 py-8">
              Tidak ada data untuk ditampilkan
            </div>
          )}
        </div>

        {/* MONITORING TABLE */}
        <div className="bg-gray-100 rounded-xl p-4 shadow-md">
          <p className="font-semibold mb-4">Riwayat Monitoring</p>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="text-left text-gray-500">
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        className="py-2 cursor-pointer select-none hover:bg-gray-200 transition-colors"
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
                    <tr key={row.id} className="border-t hover:bg-gray-50 transition-colors">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="py-2">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr className="border-t">
                    <td colSpan={columns.length} className="py-4 text-center text-gray-500">
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
                  <div key={row.id} className="bg-white rounded-lg p-3 shadow-sm border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">{formatDate(record.date)}</span>
                      <span className="text-green-600 text-xs font-medium bg-green-100 px-2 py-1 rounded">{record.aiRisk}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-500">Suhu:</span> {record.temperature}°C</div>
                      <div><span className="text-gray-500">pH:</span> {record.ph}</div>
                      <div><span className="text-gray-500">DO:</span> {record.do} ppm</div>
                      <div><span className="text-gray-500">Heater:</span> {record.heater}</div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="bg-white rounded-lg p-4 text-center text-gray-500">
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
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-[#085C85] text-white hover:bg-[#064a6a]'
                }`}
              >
                Previous
              </button>
              
              <span className="text-sm text-gray-600">
                Halaman {table.getState().pagination.pageIndex + 1} dari {table.getPageCount()}
              </span>
              
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  !table.getCanNextPage()
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-[#085C85] text-white hover:bg-[#064a6a]'
                }`}
              >
                Next
              </button>
            </div>
          )}
        </div>

      </div>
    </MainLayout>
  )
}
