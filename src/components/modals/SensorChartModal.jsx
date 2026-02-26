import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTimes } from "@fortawesome/free-solid-svg-icons"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

const SENSOR_CONFIG = {
  temperature: {
    label: "Suhu Air",
    unit: "°C",
    color: "#F0DF22",
    dataKey: "temperature",
    thresholds: { safe: [26, 32], warn: [24, 34] },
  },
  ph: {
    label: "pH Air",
    unit: "",
    color: "#085C85",
    dataKey: "ph",
    thresholds: { safe: [6.5, 8.5], warn: [6.0, 9.0] },
  },
  do: {
    label: "Oksigen Terlarut (DO)",
    unit: "ppm",
    color: "#72BB53",
    dataKey: "do",
    thresholds: { safe: [5, Infinity], warn: [4, Infinity] },
  },
}

export default function SensorChartModal({ isOpen, onClose, sensorType, historicalData }) {
  if (!isOpen || !sensorType) return null

  const config = SENSOR_CONFIG[sensorType]
  if (!config) return null

  // Format tooltip date
  const formatDate = (date) => {
    if (!date) return "-"
    const d = new Date(date)
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) +
      " " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false })
  }

  // Format X axis to show time
  const formatTime = (date) => {
    const d = new Date(date)
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  }

  // Sort data ascending so latest readings appear on the right
  const chartData = [...historicalData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg mx-3 max-w-2xl w-full animate-fade-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">
              Grafik {config.label}
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Data historis sensor
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} className="text-xl" />
          </button>
        </div>

        {/* Chart */}
        <div className="p-4">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatTime}
                  fontSize={11}
                  tick={{ fill: "#9ca3af" }}
                />
                <YAxis
                  fontSize={11}
                  tick={{ fill: "#9ca3af" }}
                  tickFormatter={(v) => config.unit ? `${v}${config.unit}` : v}
                />
                <Tooltip
                  labelFormatter={formatDate}
                  formatter={(value) => [`${value}${config.unit ? " " + config.unit : ""}`, config.label]}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    fontSize: "13px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey={config.dataKey}
                  stroke={config.color}
                  strokeWidth={2.5}
                  dot={{ fill: config.color, r: 3 }}
                  activeDot={{ r: 6, stroke: config.color, strokeWidth: 2, fill: "white" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-12">
              Tidak ada data historis untuk ditampilkan
            </div>
          )}

          {/* Threshold Legend */}
          {config.thresholds && (
            <div className="flex flex-wrap gap-3 mt-4 text-xs text-gray-500 dark:text-gray-400 justify-center">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                Aman: {config.thresholds.safe[0]}–{config.thresholds.safe[1] === Infinity ? "∞" : config.thresholds.safe[1]} {config.unit}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                Waspada: {config.thresholds.warn[0]}–{config.thresholds.warn[1] === Infinity ? "∞" : config.thresholds.warn[1]} {config.unit}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                Bahaya: di luar batas
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
